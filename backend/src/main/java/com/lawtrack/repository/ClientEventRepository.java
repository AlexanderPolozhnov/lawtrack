package com.lawtrack.repository;

import com.lawtrack.entity.ClientEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClientEventRepository extends JpaRepository<ClientEvent, Long> {
    List<ClientEvent> findAllByClientIdOrderByCreatedAtAsc(Long clientId);
}
