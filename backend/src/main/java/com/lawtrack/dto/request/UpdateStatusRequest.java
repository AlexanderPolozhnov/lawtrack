package com.lawtrack.dto.request;

import com.lawtrack.entity.ClientStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStatusRequest {

    @NotNull(message = "Статус обязателен")
    private ClientStatus status;
}
