package com.lawtrack.repository;

import com.lawtrack.entity.Client;
import com.lawtrack.entity.ClientStatus;
import com.lawtrack.dto.response.StatusCountResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {

    @Query("SELECT c FROM Client c WHERE " +
           "(:status IS NULL OR c.status = :status) " +
           "ORDER BY c.createdAt DESC")
    List<Client> findAllByStatus(@Param("status") ClientStatus status);

    @Query("SELECT c FROM Client c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR c.phone LIKE CONCAT('%', :search, '%')) " +
           "ORDER BY c.createdAt DESC")
    List<Client> findAllByStatusAndSearch(@Param("status") ClientStatus status, @Param("search") String search);

    @Query("SELECT new com.lawtrack.dto.response.StatusCountResponse(" +
           "COALESCE(SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.NEW THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.IN_PROGRESS THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN c.status = com.lawtrack.entity.ClientStatus.CLOSED THEN 1L ELSE 0L END), 0L), " +
           "COUNT(c)) " +
           "FROM Client c")
    StatusCountResponse getStatusCounts();
}
