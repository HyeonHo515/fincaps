package com.community.community_chat.repository;

import com.community.community_chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChannelChannelIdOrderByCreatedAtAsc(Long channelId);
}