package com.community.community_chat.repository;

import com.community.community_chat.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    List<DirectMessage> findByRoomRoomIdAndSenderUserIdAndReceiverUserIdOrRoomRoomIdAndSenderUserIdAndReceiverUserIdOrderByCreatedAtAsc(
            Long roomId1, Long senderId1, Long receiverId1,
            Long roomId2, Long senderId2, Long receiverId2);
}