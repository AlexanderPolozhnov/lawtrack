package com.lawtrack.repository;

import com.lawtrack.entity.TelegramChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TelegramChatRepository extends JpaRepository<TelegramChat, String> {
}
