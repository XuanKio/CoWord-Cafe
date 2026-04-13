package org.example.cowordptit.service;

import org.example.cowordptit.entity.CafeSession;
import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CafeSessionService {

    private final CafeSessionRepository sessionRepository;
    private final CustomerRepository customerRepository;

    public CafeSessionService(CafeSessionRepository sessionRepository, CustomerRepository customerRepository) {
        this.sessionRepository = sessionRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllSessions() {
        return sessionRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveSessions() {
        return sessionRepository.findByStatus(CafeSession.SessionStatus.ONGOING).stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSessionsByCustomer(Long customerId) {
        return sessionRepository.findByCustomer_UsersId(customerId).stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> checkIn(Long usersId) {
        Customer customer = customerRepository.findById(usersId).orElse(null);
        if (customer == null) {
            throw new IllegalArgumentException("Không tìm thấy khách hàng");
        }

        if (customer.getStatus() == Customer.CustomerStatus.UNACTIVE
                || customer.getStatus() == Customer.CustomerStatus.INACTIVE) {
            throw new IllegalArgumentException("Tài khoản đã bị khóa");
        }

        if (customer.getRemainingHours() == null || customer.getRemainingHours().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Bạn đã hết thời gian sử dụng dịch vụ, hãy ra quầy để nạp");
        }

        boolean hasActive = sessionRepository
                .findByCustomer_UsersIdAndStatus(usersId, CafeSession.SessionStatus.ONGOING)
                .isPresent();
        if (hasActive) {
            throw new IllegalArgumentException("Khách hàng đang có phiên chưa kết thúc");
        }

        CafeSession session = new CafeSession();
        session.setCustomer(customer);
        session.setCheckIn(LocalDateTime.now());
        session.setStatus(CafeSession.SessionStatus.ONGOING);

        return toMap(sessionRepository.save(session));
    }

    @Transactional
    public Optional<Map<String, Object>> checkOut(Long sessionId) {
        Optional<CafeSession> maybeSession = sessionRepository.findById(sessionId);
        if (maybeSession.isEmpty()) {
            return Optional.empty();
        }

        CafeSession session = maybeSession.get();
        if (session.getStatus() == CafeSession.SessionStatus.COMPLETED) {
            throw new IllegalArgumentException("Phiên đã kết thúc rồi");
        }

        LocalDateTime now = LocalDateTime.now();
        session.setCheckOut(now);
        session.setStatus(CafeSession.SessionStatus.COMPLETED);

        long minutes = Duration.between(session.getCheckIn(), now).toMinutes();
        BigDecimal hoursUsed = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        session.setHoursUsed(hoursUsed);

        Customer customer = session.getCustomer();
        BigDecimal remaining = customer.getRemainingHours().subtract(hoursUsed);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            remaining = BigDecimal.ZERO;
        }
        customer.setRemainingHours(remaining);

        customerRepository.save(customer);
        return Optional.of(toMap(sessionRepository.save(session)));
    }

    private Map<String, Object> toMap(CafeSession session) {
        Map<String, Object> map = new HashMap<>();
        map.put("sessionsId", session.getSessionsId());
        map.put("usersId", session.getCustomer().getUsersId());
        map.put("customerName", session.getCustomer().getName());
        map.put("customerPhone", session.getCustomer().getPhone());
        map.put("checkIn", session.getCheckIn().toString());
        map.put("checkOut", session.getCheckOut() != null ? session.getCheckOut().toString() : null);
        map.put("hoursUsed", session.getHoursUsed());
        map.put("status", session.getStatus().name());
        return map;
    }
}
