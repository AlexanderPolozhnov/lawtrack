package com.lawtrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusCountResponse {
    private long newCount;
    private long inProgressCount;
    private long closedCount;
    private long total;
}
