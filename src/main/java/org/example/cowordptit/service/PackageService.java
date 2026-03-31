package org.example.cowordptit.service;

import lombok.RequiredArgsConstructor;
import org.example.cowordptit.entity.TimePackage;
import org.example.cowordptit.repository.PackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PackageService {

    private final PackageRepository packageRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll() {
        return packageRepository.findAll().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAvailable() {
        return packageRepository.findByStatus(TimePackage.PackageStatus.AVAILABLE).stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getById(Long id) {
        return packageRepository.findById(id).map(this::toMap);
    }

    @Transactional
    public Map<String, Object> create(String name, BigDecimal hoursAmount, BigDecimal price) {
        TimePackage timePackage = new TimePackage();
        timePackage.setName(name);
        timePackage.setHoursAmount(hoursAmount);
        timePackage.setPrice(price);
        timePackage.setStatus(TimePackage.PackageStatus.AVAILABLE);
        return toMap(packageRepository.save(timePackage));
    }

    @Transactional
    public Optional<Map<String, Object>> update(Long id, String name, String status, BigDecimal hoursAmount, BigDecimal price) {
        Optional<TimePackage> maybePackage = packageRepository.findById(id);
        if (maybePackage.isEmpty()) {
            return Optional.empty();
        }

        TimePackage timePackage = maybePackage.get();
        if (name != null) {
            timePackage.setName(name);
        }
        if (hoursAmount != null) {
            timePackage.setHoursAmount(hoursAmount);
        }
        if (price != null) {
            timePackage.setPrice(price);
        }
        if (status != null) {
            try {
                timePackage.setStatus(TimePackage.PackageStatus.valueOf(status));
            } catch (Exception ignored) {
            }
        }
        return Optional.of(toMap(packageRepository.save(timePackage)));
    }

    @Transactional
    public boolean delete(Long id) {
        if (!packageRepository.existsById(id)) {
            return false;
        }
        packageRepository.deleteById(id);
        return true;
    }

    private Map<String, Object> toMap(TimePackage timePackage) {
        return Map.of(
                "packagesId", timePackage.getPackagesId(),
                "name", timePackage.getName(),
                "hoursAmount", timePackage.getHoursAmount(),
                "price", timePackage.getPrice(),
                "status", timePackage.getStatus().name());
    }
}
