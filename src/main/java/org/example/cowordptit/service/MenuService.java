package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.MenuIItem;
import org.example.cowordptit.repository.CafeServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final CafeServiceRepository cafeServiceRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll() {
        return cafeServiceRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailable() {
        return cafeServiceRepository.findByStatus(MenuIItem.ServiceStatus.AVAILABLE).stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getById(Long id) {
        return cafeServiceRepository.findById(id).map(this::toMap);
    }

    @Transactional
    public Map<String, Object> create(String name, String type, BigDecimal price) {
        MenuIItem service = new MenuIItem();
        service.setName(name);
        service.setType(MenuIItem.ServiceType.valueOf(type));
        service.setPrice(price);
        service.setStatus(MenuIItem.ServiceStatus.AVAILABLE);
        return toMap(cafeServiceRepository.save(service));
    }

    @Transactional
    public Optional<Map<String, Object>> update(Long id, String name, String type, String status, BigDecimal price) {
        Optional<MenuIItem> maybeService = cafeServiceRepository.findById(id);
        if (maybeService.isEmpty()) {
            return Optional.empty();
        }

        MenuIItem service = maybeService.get();
        if (name != null) {
            service.setName(name);
        }
        if (price != null) {
            service.setPrice(price);
        }
        if (type != null) {
            try {
                service.setType(MenuIItem.ServiceType.valueOf(type));
            } catch (Exception ignored) {
            }
        }
        if (status != null) {
            try {
                service.setStatus(MenuIItem.ServiceStatus.valueOf(status));
            } catch (Exception ignored) {
            }
        }

        return Optional.of(toMap(cafeServiceRepository.save(service)));
    }

    @Transactional
    public boolean delete(Long id) {
        if (!cafeServiceRepository.existsById(id)) {
            return false;
        }
        cafeServiceRepository.deleteById(id);
        return true;
    }

    private Map<String, Object> toMap(MenuIItem service) {
        return Map.of(
                "servicesId", service.getServicesId(),
                "name", service.getName(),
                "type", service.getType().name(),
                "price", service.getPrice(),
                "status", service.getStatus().name());
    }
}
