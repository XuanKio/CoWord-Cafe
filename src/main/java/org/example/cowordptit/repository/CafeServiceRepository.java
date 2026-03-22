package org.example.cowordptit.repository;

import org.example.cowordptit.entity.CafeService;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CafeServiceRepository extends JpaRepository<CafeService, Long> {
    List<CafeService> findByStatus(CafeService.ServiceStatus status);

    List<CafeService> findByType(CafeService.ServiceType type);
}
