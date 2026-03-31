package org.example.cowordptit.repository;

import org.example.cowordptit.entity.MenuIItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CafeServiceRepository extends JpaRepository<MenuIItem, Long> {
    List<MenuIItem> findByStatus(MenuIItem.ServiceStatus status);

    List<MenuIItem> findByType(MenuIItem.ServiceType type);
}
