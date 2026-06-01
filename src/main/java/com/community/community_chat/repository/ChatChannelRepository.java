package com.community.community_chat.repository;

import com.community.community_chat.entity.ChatChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, Long> {
    List<ChatChannel> findByRoomRoomId(Long roomId);
}