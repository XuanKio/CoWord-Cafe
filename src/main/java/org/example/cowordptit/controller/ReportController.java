package org.example.cowordptit.controller;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.entity.PaymentRecord;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.repository.PaymentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final BigDecimal SESSION_HOURLY_RATE = new BigDecimal("18000");

    private final PaymentRepository paymentRepository;
    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getReports(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {

        TreeMap<LocalDate, DailyRevenue> daily = new TreeMap<>();

        for (PaymentRecord payment : paymentRepository.findAll()) {
            LocalDate date = payment.getCreatedAt().toLocalDate();
            if (!inRange(date, from, to)) {
                continue;
            }

            DailyRevenue row = daily.computeIfAbsent(date, ignored -> new DailyRevenue());
            ServiceRequest req = payment.getServiceRequest();

            if (req.getService() != null) {
                row.serviceRevenue = row.serviceRevenue.add(payment.getAmount());
                row.serviceOrderCount += req.getQuantity() != null ? req.getQuantity() : 1;
            } else if (req.getTimePackage() != null) {
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

        return ResponseEntity.ok(response);
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
}
