package com.community.community_chat.repository;

import com.community.community_chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByInviteCode(String inviteCode);

    @Query("""
                SELECT r
                FROM ChatRoom r
                JOIN ChatRoomMember m ON r.roomId = m.room.roomId
                WHERE m.user.userId = :userId
            """)
    List<ChatRoom> findRoomsByUserId(@Param("userId") Long userId);
}