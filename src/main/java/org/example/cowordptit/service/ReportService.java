package org.example.cowordptit.service;

import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.entity.PaymentRecord;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.repository.PaymentRepository;
import org.example.cowordptit.repository.ServiceRequestRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
public class ReportService {

    private static final BigDecimal SESSION_HOURLY_RATE = new BigDecimal("18000");

    private final PaymentRepository paymentRepository;
    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;
    private final ServiceRequestRepository requestRepository;
    private final BigDecimal vipPurchasedHoursThreshold;

    public ReportService(PaymentRepository paymentRepository, CafeSessionRepository sessionRepository,
            CustomerRepository customerRepository, ServiceRequestRepository requestRepository,
            @Value("${app.vip.purchased-hours-threshold:60}") BigDecimal vipPurchasedHoursThreshold) {
        this.paymentRepository = paymentRepository;
        this.sessionRepository = sessionRepository;
        this.customerRepository = customerRepository;
        this.requestRepository = requestRepository;
        this.vipPurchasedHoursThreshold = vipPurchasedHoursThreshold;
    }

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
    public Map<String, Object> getTransactionReport(String month, LocalDate from, LocalDate to, BigDecimal vipThreshold) {
        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;

        if (month != null && !month.isBlank()) {
            YearMonth selected = YearMonth.parse(month);
            effectiveFrom = selected.atDay(1);
            effectiveTo = selected.atEndOfMonth();
        }

        List<Map<String, Object>> transactions = buildTransactions(effectiveFrom, effectiveTo);
        List<Map<String, Object>> allTimeTransactions = buildTransactions(null, null);
        Map<Long, CustomerVipMetrics> customerVipMetrics = buildCustomerVipMetrics();
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

        BigDecimal normalizedVipThreshold = vipThreshold != null && vipThreshold.compareTo(BigDecimal.ZERO) > 0
                ? vipThreshold
                : new BigDecimal("1000000");

        Map<String, Object> vip = new LinkedHashMap<>();
        vip.put("threshold", normalizedVipThreshold);
        vip.put("purchasedHoursThreshold", vipPurchasedHoursThreshold);
        vip.put("month", buildVipSummary(transactions, normalizedVipThreshold, customerVipMetrics));
        vip.put("allTime", buildVipSummary(allTimeTransactions, normalizedVipThreshold, customerVipMetrics));

        Map<String, Object> leaderboard = new LinkedHashMap<>();
        leaderboard.put("month", buildLeaderboard(transactions, customerVipMetrics));
        leaderboard.put("allTime", buildLeaderboard(allTimeTransactions, customerVipMetrics));

        Map<String, Object> serviceTrend = buildServiceTrend(dailyMap);

        return Map.of(
                "period", period,
                "summary", Map.of(
                        "totalRevenue", totalRevenue,
                        "totalTransactions", totalTransactions,
                        "activeDays", daily.size(),
                        "serviceRevenue", totalServiceRevenue,
                        "packageRevenue", totalPackageRevenue),
                "serviceTrend", serviceTrend,
                "vip", vip,
                "leaderboard", leaderboard,
                "daily", daily,
                "transactions", transactions);
    }

    private Map<Long, CustomerVipMetrics> buildCustomerVipMetrics() {
        Map<Long, CustomerVipMetrics> metricsByCustomer = new HashMap<>();

        for (Customer customer : customerRepository.findAll()) {
            if (customer.getUsersId() == null) {
                continue;
            }
            CustomerVipMetrics metrics = new CustomerVipMetrics();
            metrics.remainingHours = customer.getRemainingHours() != null ? customer.getRemainingHours() : BigDecimal.ZERO;
            metricsByCustomer.put(customer.getUsersId(), metrics);
        }

        for (CafeSession session : sessionRepository.findAll()) {
            if (session.getCustomer() == null || session.getCustomer().getUsersId() == null) {
                continue;
            }

            Long usersId = session.getCustomer().getUsersId();
            CustomerVipMetrics metrics = metricsByCustomer.computeIfAbsent(usersId, ignored -> new CustomerVipMetrics());
            metrics.totalUsedHours = metrics.totalUsedHours.add(resolveUsedHours(session));
        }

        for (CustomerVipMetrics metrics : metricsByCustomer.values()) {
            metrics.totalUsedHours = metrics.totalUsedHours.setScale(2, RoundingMode.HALF_UP);
            metrics.totalPurchasedHours = metrics.totalUsedHours.add(metrics.remainingHours).setScale(2, RoundingMode.HALF_UP);
            metrics.isVip = metrics.totalPurchasedHours.compareTo(vipPurchasedHoursThreshold) >= 0;
        }

        return metricsByCustomer;
    }

    private BigDecimal resolveUsedHours(CafeSession session) {
        if (session.getStatus() == CafeSession.SessionStatus.ONGOING && session.getCheckIn() != null) {
            long mins = Duration.between(session.getCheckIn(), LocalDateTime.now()).toMinutes();
            if (mins <= 0) {
                return BigDecimal.ZERO;
            }
            return BigDecimal.valueOf(mins).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }

        if (session.getHoursUsed() == null || session.getHoursUsed().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return session.getHoursUsed();
    }

    private Map<String, Object> buildLeaderboard(List<Map<String, Object>> transactions,
            Map<Long, CustomerVipMetrics> customerVipMetrics) {
        Map<Long, CustomerRevenue> byCustomer = new HashMap<>();

        for (Map<String, Object> txn : transactions) {
            Long usersId = (Long) txn.get("usersId");
            if (usersId == null) {
                continue;
            }

            String name = (String) txn.get("customerName");
            String phone = (String) txn.get("customerPhone");
            BigDecimal amount = txn.get("amount") instanceof BigDecimal value ? value : BigDecimal.ZERO;

            CustomerRevenue row = byCustomer.computeIfAbsent(usersId, ignored -> new CustomerRevenue(usersId, name, phone));
            row.totalRevenue = row.totalRevenue.add(amount);
        }

        List<CustomerRevenue> sorted = byCustomer.values().stream()
                .sorted((a, b) -> b.totalRevenue.compareTo(a.totalRevenue))
                .toList();

        List<Map<String, Object>> items = new ArrayList<>();
        int rank = 1;
        for (CustomerRevenue row : sorted) {
            CustomerVipMetrics metrics = customerVipMetrics.getOrDefault(row.usersId, new CustomerVipMetrics());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("rank", rank++);
            item.put("usersId", row.usersId);
            item.put("name", row.name);
            item.put("phone", row.phone);
            item.put("revenue", row.totalRevenue);
            item.put("totalHoursUsed", metrics.totalUsedHours);
            item.put("totalPurchasedHours", metrics.totalPurchasedHours);
            item.put("isVipByHours", metrics.isVip);
            item.put("isVipByPurchasedHours", metrics.isVip);
            items.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", items.size());
        result.put("items", items);
        return result;
    }

    private Map<String, Object> buildServiceTrend(Map<String, DailyTransactionRevenue> dailyMap) {
        Map<String, BigDecimal> serviceTotals = new HashMap<>();
        for (DailyTransactionRevenue day : dailyMap.values()) {
            for (Map.Entry<String, ItemRevenue> entry : day.items.entrySet()) {
                ItemRevenue item = entry.getValue();
                if (!"SERVICE".equals(item.type)) {
                    continue;
                }
                serviceTotals.merge(item.name, item.revenue, BigDecimal::add);
            }
        }

        List<String> topServiceNames = serviceTotals.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .toList();

        List<String> labels = new ArrayList<>(dailyMap.keySet());
        labels.sort(String::compareTo);

        List<Map<String, Object>> services = new ArrayList<>();
        for (String serviceName : topServiceNames) {
            List<BigDecimal> data = new ArrayList<>();
            BigDecimal totalRevenue = BigDecimal.ZERO;

            for (String date : labels) {
                DailyTransactionRevenue row = dailyMap.get(date);
                String key = "SERVICE:" + serviceName;
                ItemRevenue item = row != null ? row.items.get(key) : null;
                BigDecimal amount = item != null ? item.revenue : BigDecimal.ZERO;
                data.add(amount);
                totalRevenue = totalRevenue.add(amount);
            }

            Map<String, Object> serviceSeries = new LinkedHashMap<>();
            serviceSeries.put("name", serviceName);
            serviceSeries.put("totalRevenue", totalRevenue);
            serviceSeries.put("data", data);
            services.add(serviceSeries);
        }

        Map<String, Object> trend = new LinkedHashMap<>();
        trend.put("labels", labels);
        trend.put("services", services);
        return trend;
    }

    private Map<String, Object> buildVipSummary(List<Map<String, Object>> transactions, BigDecimal threshold,
            Map<Long, CustomerVipMetrics> customerVipMetrics) {
        Map<Long, CustomerRevenue> byCustomer = new HashMap<>();

        for (Map<String, Object> txn : transactions) {
            Long usersId = (Long) txn.get("usersId");
            if (usersId == null) {
                continue;
            }
            String name = (String) txn.get("customerName");
            String phone = (String) txn.get("customerPhone");
            BigDecimal amount = txn.get("amount") instanceof BigDecimal value ? value : BigDecimal.ZERO;

            CustomerRevenue revenue = byCustomer.computeIfAbsent(usersId,
                    ignored -> new CustomerRevenue(usersId, name, phone));
            revenue.totalRevenue = revenue.totalRevenue.add(amount);
        }

        List<Map<String, Object>> customers = byCustomer.values().stream()
                .sorted((a, b) -> b.totalRevenue.compareTo(a.totalRevenue))
                .map(item -> {
                    CustomerVipMetrics metrics = customerVipMetrics.getOrDefault(item.usersId, new CustomerVipMetrics());
                    boolean isVipByRevenue = item.totalRevenue.compareTo(threshold) >= 0;
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("usersId", item.usersId);
                    row.put("name", item.name);
                    row.put("phone", item.phone);
                    row.put("revenue", item.totalRevenue);
                    row.put("totalHoursUsed", metrics.totalUsedHours);
                    row.put("totalPurchasedHours", metrics.totalPurchasedHours);
                    row.put("isVip", isVipByRevenue);
                    row.put("isVipByHours", metrics.isVip);
                    row.put("isVipByPurchasedHours", metrics.isVip);
                    row.put("tier", isVipByRevenue ? "VIP" : "REGULAR");
                    return row;
                })
                .toList();

        long vipCount = customers.stream()
                .filter(row -> Boolean.TRUE.equals(row.get("isVip")))
                .count();

        BigDecimal totalRevenue = byCustomer.values().stream()
                .map(item -> item.totalRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", vipCount);
        result.put("totalCustomers", customers.size());
        result.put("totalRevenue", totalRevenue);
        result.put("customers", customers);
        return result;
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
        String customerPhone = request.getCustomer() != null ? request.getCustomer().getPhone() : null;
        Long usersId = request.getCustomer() != null ? request.getCustomer().getUsersId() : null;

        int quantity = request.getQuantity() != null ? request.getQuantity() : 1;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("reqId", request.getServiceRequestsId());
        row.put("amount", amount != null ? amount : BigDecimal.ZERO);
        row.put("method", paymentMethod != null ? paymentMethod.toUpperCase(Locale.ROOT) : "CASH");
        row.put("date", date);
        row.put("usersId", usersId);
        row.put("customerName", customerName);
        row.put("customerPhone", customerPhone);
        row.put("itemName", itemName);
        row.put("itemType", itemType);
        row.put("serviceCategory", request.getService() != null && request.getService().getType() != null
                ? request.getService().getType().name()
                : null);
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

    private static class CustomerRevenue {
        private final Long usersId;
        private final String name;
        private final String phone;
        private BigDecimal totalRevenue = BigDecimal.ZERO;

        private CustomerRevenue(Long usersId, String name, String phone) {
            this.usersId = usersId;
            this.name = name;
            this.phone = phone;
        }
    }

    private static class CustomerVipMetrics {
        private BigDecimal remainingHours = BigDecimal.ZERO;
        private BigDecimal totalUsedHours = BigDecimal.ZERO;
        private BigDecimal totalPurchasedHours = BigDecimal.ZERO;
        private boolean isVip = false;
    }
}
