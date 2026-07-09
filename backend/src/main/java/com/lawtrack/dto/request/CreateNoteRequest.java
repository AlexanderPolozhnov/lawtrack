package com.lawtrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateNoteRequest {

    @NotBlank(message = "Текст заметки обязателен")
    private String note;
}
