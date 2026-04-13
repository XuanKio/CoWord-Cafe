package org.example.cowordptit.service;

import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SessionMonitorService {

    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;

    public SessionMonitorService(CafeSessionRepository sessionRepository, CustomerRepository customerRepository) {
        this.sessionRepository = sessionRepository;
        this.customerRepository = customerRepository;
    }

    @Scheduled(fixedRate = 60000) // Kiem tra moi phut
    @Transactional
    public void checkAndAutoCheckout() {
        List<CafeSession> activeSessions = sessionRepository.findByStatus(CafeSession.SessionStatus.ONGOING);
        LocalDateTime now = LocalDateTime.now();

        for (CafeSession session : activeSessions) {
            Customer customer = session.getCustomer();
            if (customer == null)
                continue;

            long minutes = Duration.between(session.getCheckIn(), now).toMinutes();
            BigDecimal hoursUsed = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            BigDecimal remaining = customer.getRemainingHours().subtract(hoursUsed);

            // Neu thoi gian da dung vuot qua hoac bang thoi gian con lai
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                // Tu dong check-out nguoi nay
                session.setCheckOut(now);
                session.setStatus(CafeSession.SessionStatus.COMPLETED);
                session.setHoursUsed(customer.getRemainingHours()); // Ghi nhan dung vua du thoi gian da co

                customer.setRemainingHours(BigDecimal.ZERO);

                customerRepository.save(customer);
                sessionRepository.save(session);

                System.out.println("✅ Auto checked-out customer: " + customer.getName() + " vi het gio.");
            }
        }
    }
}
