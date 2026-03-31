package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.entity.PaymentRecord;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.repository.PaymentRepository;
import org.example.cowordptit.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final BigDecimal SESSION_HOURLY_RATE = new BigDecimal("18000");

    private final PaymentRepository paymentRepository;
    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;
    private final ServiceRequestRepository requestRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReports(LocalDate from, LocalDate to) {
        TreeMap<LocalDate, DailyRevenue> daily = new TreeMap<>();

        for (PaymentRecord payment : paymentRepository.findAll()) {
            LocalDate date = payment.getCreatedAt().toLocalDate();
            if (!inRange(date, from, to)) {
                continue;
            }

            DailyRevenue row = daily.computeIfAbsent(date, ignored -> new DailyRevenue());
            ServiceRequest request = payment.getServiceRequest();

            if (request.getService() != null) {
                row.serviceRevenue = row.serviceRevenue.add(payment.getAmount());
                row.serviceOrderCount += request.getQuantity() != null ? request.getQuantity() : 1;
            } else if (request.getTimePackage() != null) {
                row.packageRevenue = row.packageRevenue.add(payment.getAmount());
            }
        }

        for (CafeSession session : sessionRepository.findAll()) {
            if (session.getStatus() != CafeSession.SessionStatus.COMPLETED || session.getCheckOut() == null) {
                continue;
            }

            LocalDate date = session.getCheckOut().toLocalDate();
            if (!inRange(date, from, to)) {
                continue;
            }

            DailyRevenue row = daily.computeIfAbsent(date, ignored -> new DailyRevenue());
            BigDecimal hoursUsed = session.getHoursUsed() == null ? BigDecimal.ZERO : session.getHoursUsed();
            BigDecimal sessionRevenue = hoursUsed.multiply(SESSION_HOURLY_RATE).setScale(2, RoundingMode.HALF_UP);

            row.sessionRevenue = row.sessionRevenue.add(sessionRevenue);
            row.sessionCount += 1;
        }

        for (Customer customer : customerRepository.findAll()) {
            if (customer.getCreatedAt() == null) {
                continue;
            }

            LocalDate date = customer.getCreatedAt().toLocalDate();
            if (!inRange(date, from, to)) {
                continue;
            }

            DailyRevenue row = daily.computeIfAbsent(date, ignored -> new DailyRevenue());
            row.newCustomers += 1;
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (Map.Entry<LocalDate, DailyRevenue> entry : daily.entrySet()) {
            DailyRevenue row = entry.getValue();
            response.add(Map.of(
                    "date", entry.getKey().toString(),
                    "sessionRevenue", row.sessionRevenue,
                    "serviceRevenue", row.serviceRevenue,
                    "packageRevenue", row.packageRevenue,
                    "sessionCount", row.sessionCount,
                    "serviceOrderCount", row.serviceOrderCount,
                    "newCustomers", row.newCustomers));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTransactionReport(String month, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;

        if (month != null && !month.isBlank()) {
            YearMonth selected = YearMonth.parse(month);
            effectiveFrom = selected.atDay(1);
            effectiveTo = selected.atEndOfMonth();
        }

        List<Map<String, Object>> transactions = buildTransactions(effectiveFrom, effectiveTo);
        Map<String, DailyTransactionRevenue> dailyMap = new TreeMap<>(Comparator.reverseOrder());

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalServiceRevenue = BigDecimal.ZERO;
        BigDecimal totalPackageRevenue = BigDecimal.ZERO;
        int totalTransactions = 0;

        for (Map<String, Object> txn : transactions) {
            String dateTime = (String) txn.get("date");
            if (dateTime == null || dateTime.length() < 10) {
                continue;
            }

            String dayKey = dateTime.substring(0, 10);
            BigDecimal amount = (BigDecimal) txn.get("amount");
            String itemType = (String) txn.get("itemType");
            Integer quantity = (Integer) txn.get("quantity");
            String itemName = (String) txn.get("itemName");

            DailyTransactionRevenue day = dailyMap.computeIfAbsent(dayKey, ignored -> new DailyTransactionRevenue(dayKey));
            day.totalRevenue = day.totalRevenue.add(amount);
            day.transactionCount += 1;
            day.transactions.add(txn);

            totalRevenue = totalRevenue.add(amount);
            totalTransactions += 1;

            if ("SERVICE".equals(itemType)) {
                day.serviceRevenue = day.serviceRevenue.add(amount);
                totalServiceRevenue = totalServiceRevenue.add(amount);
            } else if ("PACKAGE".equals(itemType)) {
                day.packageRevenue = day.packageRevenue.add(amount);
                totalPackageRevenue = totalPackageRevenue.add(amount);
            }

            String itemKey = itemType + ":" + itemName;
            ItemRevenue item = day.items.computeIfAbsent(itemKey, ignored -> new ItemRevenue(itemName, itemType));
            item.qty += quantity;
            item.revenue = item.revenue.add(amount);
        }

        List<Map<String, Object>> daily = new ArrayList<>();
        for (DailyTransactionRevenue row : dailyMap.values()) {
            List<Map<String, Object>> topItems = row.items.values().stream()
                    .sorted((a, b) -> b.revenue.compareTo(a.revenue))
                    .limit(2)
                    .map(item -> Map.<String, Object>of(
                            "name", item.name,
                            "type", item.type,
                            "qty", item.qty,
                            "revenue", item.revenue))
                    .toList();

            daily.add(Map.of(
                    "date", row.date,
                    "totalRevenue", row.totalRevenue,
                    "transactionCount", row.transactionCount,
                    "serviceRevenue", row.serviceRevenue,
                    "packageRevenue", row.packageRevenue,
                    "topItems", topItems,
                    "transactions", row.transactions));
        }

        Map<String, Object> period = new LinkedHashMap<>();
        if (month != null && !month.isBlank()) {
            period.put("month", month);
        }
        period.put("from", effectiveFrom != null ? effectiveFrom.toString() : null);
        period.put("to", effectiveTo != null ? effectiveTo.toString() : null);

        return Map.of(
                "period", period,
                "summary", Map.of(
                        "totalRevenue", totalRevenue,
                        "totalTransactions", totalTransactions,
                        "activeDays", daily.size(),
                        "serviceRevenue", totalServiceRevenue,
                        "packageRevenue", totalPackageRevenue),
                "daily", daily,
                "transactions", transactions);
    }

    private List<Map<String, Object>> buildTransactions(LocalDate from, LocalDate to) {
        Map<Long, ServiceRequest> requestById = new HashMap<>();
        for (ServiceRequest request : requestRepository.findAll()) {
            requestById.put(request.getServiceRequestsId(), request);
        }

        Set<Long> paymentRequestIds = new HashSet<>();
        List<Map<String, Object>> transactions = new ArrayList<>();

        for (PaymentRecord payment : paymentRepository.findAll()) {
            ServiceRequest request = payment.getServiceRequest();
            if (request == null || request.getServiceRequestsId() == null) {
                continue;
            }

            LocalDate date = payment.getCreatedAt() != null ? payment.getCreatedAt().toLocalDate() : null;
            if (date == null || !inRange(date, from, to)) {
                continue;
            }

            paymentRequestIds.add(request.getServiceRequestsId());
            transactions.add(toTransactionMap(
                    "P#" + payment.getTransactionsId(),
                    request,
                    payment.getAmount(),
                    payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "CASH",
                    payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null));
        }

        for (ServiceRequest request : requestById.values()) {
            if (request.getServiceRequestsId() == null || paymentRequestIds.contains(request.getServiceRequestsId())) {
                continue;
            }

            if (request.getStatus() != ServiceRequest.RequestStatus.APPROVED
                    && request.getStatus() != ServiceRequest.RequestStatus.PAID) {
                continue;
            }

            BigDecimal totalPrice = request.getTotalPrice() != null ? request.getTotalPrice() : BigDecimal.ZERO;
            if (totalPrice.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            LocalDate date = request.getCreatedAt() != null ? request.getCreatedAt().toLocalDate() : null;
            if (date == null || !inRange(date, from, to)) {
                continue;
            }

            transactions.add(toTransactionMap(
                    "R#" + request.getServiceRequestsId(),
                    request,
                    totalPrice,
                    "LEGACY",
                    request.getCreatedAt() != null ? request.getCreatedAt().toString() : null));
        }

        transactions.sort((a, b) -> {
            String firstDate = (String) a.get("date");
            String secondDate = (String) b.get("date");
            if (firstDate == null && secondDate == null) {
                return 0;
            }
            if (firstDate == null) {
                return 1;
            }
            if (secondDate == null) {
                return -1;
            }
            return secondDate.compareTo(firstDate);
        });

        return transactions;
    }

    private Map<String, Object> toTransactionMap(
            String id,
            ServiceRequest request,
            BigDecimal amount,
            String paymentMethod,
            String date) {

        String itemName = "Yeu cau #" + request.getServiceRequestsId();
        String itemType = "OTHER";

        if (request.getService() != null) {
            itemName = request.getService().getName();
            itemType = "SERVICE";
        } else if (request.getTimePackage() != null) {
            itemName = request.getTimePackage().getName();
            itemType = "PACKAGE";
        }

        String customerName = request.getCustomer() != null && request.getCustomer().getName() != null
                ? request.getCustomer().getName()
                : "N/A";

        int quantity = request.getQuantity() != null ? request.getQuantity() : 1;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("reqId", request.getServiceRequestsId());
        row.put("amount", amount != null ? amount : BigDecimal.ZERO);
        row.put("method", paymentMethod != null ? paymentMethod.toUpperCase(Locale.ROOT) : "CASH");
        row.put("date", date);
        row.put("customerName", customerName);
        row.put("itemName", itemName);
        row.put("itemType", itemType);
        row.put("quantity", quantity);
        return row;
    }

    private boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        if (from != null && date.isBefore(from)) {
            return false;
        }
        if (to != null && date.isAfter(to)) {
            return false;
        }
        return true;
    }

    private static class DailyRevenue {
        private BigDecimal sessionRevenue = BigDecimal.ZERO;
        private BigDecimal serviceRevenue = BigDecimal.ZERO;
        private BigDecimal packageRevenue = BigDecimal.ZERO;
        private int sessionCount = 0;
        private int serviceOrderCount = 0;
        private int newCustomers = 0;
    }

    private static class DailyTransactionRevenue {
        private final String date;
        private BigDecimal totalRevenue = BigDecimal.ZERO;
        private int transactionCount = 0;
        private BigDecimal serviceRevenue = BigDecimal.ZERO;
        private BigDecimal packageRevenue = BigDecimal.ZERO;
        private final Map<String, ItemRevenue> items = new HashMap<>();
        private final List<Map<String, Object>> transactions = new ArrayList<>();

        private DailyTransactionRevenue(String date) {
            this.date = date;
        }
    }

    private static class ItemRevenue {
        private final String name;
        private final String type;
        private int qty = 0;
        private BigDecimal revenue = BigDecimal.ZERO;

        private ItemRevenue(String name, String type) {
            this.name = name;
            this.type = type;
        }
    }
}
