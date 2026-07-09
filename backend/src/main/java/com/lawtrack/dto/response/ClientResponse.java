package com.lawtrack.dto.response;

import com.lawtrack.entity.ClientStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientResponse {
    private Long id;
    private String name;
    private String phone;
    private ClientStatus status;
    private String statusDisplayName;
    private String caseDescription;
    private LocalDate deadline;
    private LocalDateTime createdAt;
}
