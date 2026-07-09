package com.lawtrack.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ClientStatus {
    NEW("Новый"),
    IN_PROGRESS("В работе"),
    CLOSED("Закрыт");

    private final String displayName;
}
