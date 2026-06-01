package com.community.community_chat.repository;

import com.community.community_chat.entity.ChatRoom;
import com.community.community_chat.entity.ChatRoomMember;
import com.community.community_chat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {
    boolean existsByRoomAndUser(ChatRoom room, User user);

    List<ChatRoomMember> findByRoomRoomId(Long roomId);

    void deleteByRoomRoomIdAndUserUserId(Long roomId, Long userId);
}