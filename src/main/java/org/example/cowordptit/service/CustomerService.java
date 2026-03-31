package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CafeSessionRepository cafeSessionRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll() {
        return customerRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getById(Long id) {
        return customerRepository.findById(id).map(this::toMap);
    }

    @Transactional
    public Map<String, Object> create(String name, String phone, String password) {
        if (customerRepository.existsByPhone(phone)) {
            throw new IllegalArgumentException("Số điện thoại đã tồn tại");
        }

        Customer customer = new Customer();
        customer.setName(name);
        customer.setPhone(phone);
        customer.setPasswordHash(password);
        customer.setRemainingHours(BigDecimal.ZERO);
        customer.setStatus(Customer.CustomerStatus.ACTIVE);
        customer.setCreatedAt(LocalDateTime.now());

        return toMap(customerRepository.save(customer));
    }

    @Transactional
    public Optional<Map<String, Object>> update(Long id, String name, String phone, String password,
            String status, BigDecimal remainingHours) {
        Optional<Customer> maybeCustomer = customerRepository.findById(id);
        if (maybeCustomer.isEmpty()) {
            return Optional.empty();
        }

        Customer customer = maybeCustomer.get();
        if (name != null) {
            customer.setName(name);
        }
        if (phone != null) {
            customer.setPhone(phone);
        }
        if (remainingHours != null) {
            customer.setRemainingHours(remainingHours);
        }
        if (status != null) {
            try {
                String normalizedStatus = "INACTIVE".equalsIgnoreCase(status) ? "UNACTIVE" : status;
                customer.setStatus(Customer.CustomerStatus.valueOf(normalizedStatus));
            } catch (Exception ignored) {
            }
        }
        if (password != null && !password.isBlank()) {
            customer.setPasswordHash(password);
        }

        return Optional.of(toMap(customerRepository.save(customer)));
    }

    @Transactional
    public boolean delete(Long id) {
        if (!customerRepository.existsById(id)) {
            return false;
        }
        customerRepository.deleteById(id);
        return true;
    }

    @Transactional
    public Optional<Map<String, Object>> addHours(Long id, BigDecimal hours) {
        Optional<Customer> maybeCustomer = customerRepository.findById(id);
        if (maybeCustomer.isEmpty()) {
            return Optional.empty();
        }

        if (hours == null || hours.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số giờ phải lớn hơn 0");
        }

        Customer customer = maybeCustomer.get();
        customer.setRemainingHours(customer.getRemainingHours().add(hours));
        return Optional.of(toMap(customerRepository.save(customer)));
    }

    private Map<String, Object> toMap(Customer customer) {
        BigDecimal remaining = customer.getRemainingHours();

        cafeSessionRepository.findByCustomer_UsersIdAndStatus(customer.getUsersId(), CafeSession.SessionStatus.ONGOING)
                .ifPresent(session -> {
                    long mins = Duration.between(session.getCheckIn(), LocalDateTime.now()).toMinutes();
                    BigDecimal used = BigDecimal.valueOf(mins).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
                    BigDecimal effective = remaining.subtract(used);
                    if (effective.compareTo(BigDecimal.ZERO) < 0) {
                        effective = BigDecimal.ZERO;
                    }
                    customer.setRemainingHours(effective);
                });

        return Map.of(
                "usersId", customer.getUsersId(),
                "name", customer.getName(),
                "phone", customer.getPhone(),
                "remainingHours", customer.getRemainingHours(),
                "status", normalizeStatus(customer.getStatus()).name(),
                "createdAt", customer.getCreatedAt().toString());
    }

    private Customer.CustomerStatus normalizeStatus(Customer.CustomerStatus status) {
        if (status == null) {
            return Customer.CustomerStatus.ACTIVE;
        }
        if (status == Customer.CustomerStatus.UNACTIVE || status == Customer.CustomerStatus.INACTIVE) {
            return Customer.CustomerStatus.UNACTIVE;
        }
        return Customer.CustomerStatus.ACTIVE;
    }
}
