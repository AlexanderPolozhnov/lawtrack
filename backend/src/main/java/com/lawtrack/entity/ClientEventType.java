package com.lawtrack.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ClientEventType {
    CREATED("Создан"),
    STATUS_CHANGED("Статус изменен"),
    NOTE_ADDED("Добавлена заметка");

    private final String displayName;
}
