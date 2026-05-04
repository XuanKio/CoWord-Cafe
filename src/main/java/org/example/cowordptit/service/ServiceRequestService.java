package org.example.cowordptit.service;

import org.example.cowordptit.entity.Customer;
import org.example.cowordptit.entity.MenuIItem;
import org.example.cowordptit.entity.ServiceRequest;
import org.example.cowordptit.entity.TimePackage;
import org.example.cowordptit.repository.CafeServiceRepository;
import org.example.cowordptit.repository.CafeSessionRepository;
import org.example.cowordptit.repository.CustomerRepository;
import org.example.cowordptit.repository.PackageRepository;
import org.example.cowordptit.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class ServiceRequestService {

    private final ServiceRequestRepository requestRepository;
    private final CustomerRepository customerRepository;
    private final CafeSessionRepository sessionRepository;
    private final CafeServiceRepository cafeServiceRepository;
    private final PackageRepository packageRepository;

    public ServiceRequestService(ServiceRequestRepository requestRepository, CustomerRepository customerRepository,
            CafeSessionRepository sessionRepository, CafeServiceRepository cafeServiceRepository,
            PackageRepository packageRepository) {
        this.requestRepository = requestRepository;
        this.customerRepository = customerRepository;
        this.sessionRepository = sessionRepository;
        this.cafeServiceRepository = cafeServiceRepository;
        this.packageRepository = packageRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll() {
        return requestRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPending() {
        return requestRepository.findByStatus(ServiceRequest.RequestStatus.PENDING).stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getByCustomer(Long customerId) {
        return requestRepository.findByCustomer_UsersId(customerId).stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> search(String q, String keyword, String customerName,
            boolean namesOnly, String status, Long usersId, String type) {
        ServiceRequest.RequestStatus statusFilter = parseStatus(status);
        String typeFilter = parseType(type);

        String normalizedKeyword = keyword != null && !keyword.isBlank()
                ? keyword.trim().toLowerCase(Locale.ROOT)
                : (q != null ? q.trim().toLowerCase(Locale.ROOT) : "");
        String normalizedCustomerName = customerName != null
                ? customerName.trim().toLowerCase(Locale.ROOT)
                : "";

        List<ServiceRequest> source = usersId != null
                ? requestRepository.findByCustomer_UsersId(usersId)
                : requestRepository.findAll();

        Comparator<ServiceRequest> createdAtDesc = (a, b) -> {
            LocalDateTime first = a.getCreatedAt();
            LocalDateTime second = b.getCreatedAt();
            if (first == null && second == null) {
                return 0;
            }
            if (first == null) {
                return 1;
            }
            if (second == null) {
                return -1;
            }
            return second.compareTo(first);
        };

        List<ServiceRequest> filtered = source.stream()
                .filter(request -> statusFilter == null || request.getStatus() == statusFilter)
                .filter(request -> {
                    if (typeFilter == null) {
                        return true;
                    }
                    if ("SERVICE".equals(typeFilter)) {
                        return request.getService() != null;
                    }
                    return request.getTimePackage() != null;
                })
                .filter(request -> matchesKeyword(request, normalizedKeyword, normalizedCustomerName))
                .sorted(createdAtDesc)
                .toList();

        List<Map<String, Object>> items = filtered.stream().map(this::toMap).toList();
        List<String> names = filtered.stream()
                .map(r -> r.getCustomer() != null ? r.getCustomer().getName() : null)
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .toList();

        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("q", q);
        filters.put("keyword", keyword);
        filters.put("customerName", customerName);
        filters.put("namesOnly", namesOnly);
        filters.put("status", statusFilter != null ? statusFilter.name() : null);
        filters.put("usersId", usersId);
        filters.put("type", typeFilter);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("count", namesOnly ? names.size() : items.size());
        response.put("filters", filters);
        response.put("items", namesOnly ? names : items);
        return response;
    }

    @Transactional
    public Map<String, Object> create(Long usersId, Long sessionsId, Long servicesId, Long packagesId, Integer quantity,
            BigDecimal price) {
        Customer customer = customerRepository.findById(usersId).orElse(null);
        if (customer == null) {
            throw new IllegalArgumentException("Khach hang khong ton tai");
        }
        if (price == null) {
            throw new IllegalArgumentException("Price khong duoc de trong");
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Price khong duoc am");
        }

        ServiceRequest serviceRequest = new ServiceRequest();
        serviceRequest.setCustomer(customer);
        serviceRequest.setQuantity(quantity != null ? quantity : 1);
        serviceRequest.setCreatedAt(LocalDateTime.now());
        serviceRequest.setStatus(ServiceRequest.RequestStatus.PENDING);

        if (sessionsId != null) {
            sessionRepository.findById(sessionsId).ifPresent(serviceRequest::setSession);
        }

        if (servicesId != null) {
            MenuIItem service = cafeServiceRepository.findById(servicesId).orElse(null);
            if (service == null) {
                throw new IllegalArgumentException("Dich vu khong ton tai");
            }
            serviceRequest.setService(service);
            serviceRequest.setTotalPrice(price.multiply(BigDecimal.valueOf(serviceRequest.getQuantity())));
        } else if (packagesId != null) {
            TimePackage timePackage = packageRepository.findById(packagesId).orElse(null);
            if (timePackage == null) {
                throw new IllegalArgumentException("Goi gio khong ton tai");
            }
            serviceRequest.setTimePackage(timePackage);
            serviceRequest.setTotalPrice(price.multiply(BigDecimal.valueOf(serviceRequest.getQuantity())));
        } else {
            throw new IllegalArgumentException("Can chon dich vu hoac goi gio");
        }

        return toMap(requestRepository.save(serviceRequest));
    }

    @Transactional
    public Optional<Map<String, Object>> approve(Long requestId) {
        Optional<ServiceRequest> maybeRequest = requestRepository.findById(requestId);
        if (maybeRequest.isEmpty()) {
            return Optional.empty();
        }

        ServiceRequest request = maybeRequest.get();
        if (request.getStatus() != ServiceRequest.RequestStatus.PENDING) {
            throw new IllegalArgumentException("Yeu cau phai o trang thai PENDING");
        }

        request.setStatus(ServiceRequest.RequestStatus.APPROVED);
        if (request.getTimePackage() != null) {
            Customer customer = request.getCustomer();
            BigDecimal addHours = request.getTimePackage().getHoursAmount()
                    .multiply(BigDecimal.valueOf(request.getQuantity()));
            customer.setRemainingHours(customer.getRemainingHours().add(addHours));
            customerRepository.save(customer);
        }

        return Optional.of(toMap(requestRepository.save(request)));
    }

    @Transactional
    public Optional<Map<String, Object>> cancel(Long requestId) {
        Optional<ServiceRequest> maybeRequest = requestRepository.findById(requestId);
        if (maybeRequest.isEmpty()) {
            return Optional.empty();
        }

        ServiceRequest request = maybeRequest.get();
        request.setStatus(ServiceRequest.RequestStatus.CANCELLED);
        return Optional.of(toMap(requestRepository.save(request)));
    }

    private ServiceRequest.RequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ServiceRequest.RequestStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Status khong hop le. Dung: PENDING, APPROVED, PAID, CANCELLED");
        }
    }

    private String parseType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }

        String normalized = type.trim().toUpperCase(Locale.ROOT);
        if (!"SERVICE".equals(normalized) && !"PACKAGE".equals(normalized)) {
            throw new IllegalArgumentException("Type khong hop le. Dung: SERVICE hoac PACKAGE");
        }
        return normalized;
    }

    private boolean matchesKeyword(ServiceRequest request, String keyword, String customerName) {
        if (!customerName.isBlank()) {
            String nameOnly = request.getCustomer() != null && request.getCustomer().getName() != null
                    ? request.getCustomer().getName().toLowerCase(Locale.ROOT)
                    : "";
            return nameOnly.contains(customerName);
        }

        if (keyword.isBlank()) {
            return true;
        }

        String customerNameValue = request.getCustomer() != null && request.getCustomer().getName() != null
                ? request.getCustomer().getName().toLowerCase(Locale.ROOT)
                : "";
        String customerPhone = request.getCustomer() != null && request.getCustomer().getPhone() != null
                ? request.getCustomer().getPhone().toLowerCase(Locale.ROOT)
                : "";
        String serviceName = request.getService() != null && request.getService().getName() != null
                ? request.getService().getName().toLowerCase(Locale.ROOT)
                : "";
        String packageName = request.getTimePackage() != null && request.getTimePackage().getName() != null
                ? request.getTimePackage().getName().toLowerCase(Locale.ROOT)
                : "";
        String requestId = request.getServiceRequestsId() != null ? String.valueOf(request.getServiceRequestsId()) : "";

        return customerNameValue.contains(keyword)
                || customerPhone.contains(keyword)
                || serviceName.contains(keyword)
                || packageName.contains(keyword)
                || requestId.contains(keyword);
    }

    private Map<String, Object> toMap(ServiceRequest request) {
        Map<String, Object> map = new HashMap<>();
        map.put("serviceRequestsId", request.getServiceRequestsId());
        map.put("usersId", request.getCustomer().getUsersId());
        map.put("customerName", request.getCustomer().getName());
        map.put("customerPhone", request.getCustomer().getPhone());
        map.put("sessionsId", request.getSession() != null ? request.getSession().getSessionsId() : null);
        map.put("servicesId", request.getService() != null ? request.getService().getServicesId() : null);
        map.put("serviceName", request.getService() != null ? request.getService().getName() : null);
        map.put("serviceType", request.getService() != null ? request.getService().getType().name() : null);
        map.put("packagesId", request.getTimePackage() != null ? request.getTimePackage().getPackagesId() : null);
        map.put("packageName", request.getTimePackage() != null ? request.getTimePackage().getName() : null);
        map.put("packageHoursAmount", request.getTimePackage() != null ? request.getTimePackage().getHoursAmount() : null);
        map.put("quantity", request.getQuantity());
        map.put("totalPrice", request.getTotalPrice());
        map.put("status", request.getStatus().name());
        map.put("createdAt", request.getCreatedAt().toString());
        return map;
    }
}
