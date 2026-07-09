package com.lawtrack.dto.response;

import com.lawtrack.entity.ClientEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientEventResponse {
    private Long id;
    private Long clientId;
    private ClientEventType eventType;
    private String description;
    private LocalDateTime createdAt;
}
