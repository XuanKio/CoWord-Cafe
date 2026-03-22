package org.example.cowordptit.repository;

import org.example.cowordptit.entity.CafeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CafeSessionRepository extends JpaRepository<CafeSession, Long> {
    List<CafeSession> findByCustomer_UsersId(Long customerId);

    Optional<CafeSession> findByCustomer_UsersIdAndStatus(Long customerId, CafeSession.SessionStatus status);

    List<CafeSession> findByStatus(CafeSession.SessionStatus status);
}
