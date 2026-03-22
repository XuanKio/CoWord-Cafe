package org.example.cowordptit.repository;

import org.example.cowordptit.entity.TimePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PackageRepository extends JpaRepository<TimePackage, Long> {
    List<TimePackage> findByStatus(TimePackage.PackageStatus status);
}
