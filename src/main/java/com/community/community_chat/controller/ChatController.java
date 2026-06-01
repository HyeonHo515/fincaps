package com.community.community_chat.controller;

import com.community.community_chat.dto.*;
import com.community.community_chat.service.ChatService;
import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/rooms")
    public List<ChatRoomResponse> getRooms(@RequestParam(required = false) Long userId) {
        if (userId == null) {
            return chatService.getRooms();
        }
        return chatService.getRooms(userId);
    }

    @PostMapping("/rooms")
    public ChatRoomResponse createRoom(@RequestBody ChatRoomCreateRequest request) {
        return chatService.createRoom(request);
    }

    @GetMapping("/rooms/{roomId}/channels")
    public List<ChatChannelResponse> getChannels(@PathVariable Long roomId) {
        return chatService.getChannels(roomId);
    }

    @GetMapping("/channels/{channelId}/messages")
    public List<ChatMessageResponse> getMessages(@PathVariable Long channelId) {
        return chatService.getMessages(channelId);
    }

    @PostMapping("/messages")
    public ChatMessageResponse sendMessage(@RequestBody ChatMessageRequest request) {
        return chatService.saveMessage(request);
    }

    @PostMapping("/rooms/join")
    public ChatRoomResponse joinRoom(@RequestBody JoinRoomRequest request) {
        return chatService.joinRoom(request);
    }

    @GetMapping("/rooms/{roomId}/members")
    public List<UserResponse> getRoomMembers(@PathVariable Long roomId) {
        return chatService.getRoomMembers(roomId);
    }

    @GetMapping("/rooms/{roomId}/dm")
    public List<DirectMessageResponse> getDirectMessages(
            @PathVariable Long roomId,
            @RequestParam Long userId,
            @RequestParam Long targetUserId) {
        return chatService.getDirectMessages(roomId, userId, targetUserId);
    }

    @PostMapping("/dm")
    public DirectMessageResponse sendDirectMessage(@RequestBody DirectMessageRequest request) {
        return chatService.sendDirectMessage(request);
    }

    @PostMapping("/messages/file")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam Long roomId,
            @RequestParam Long channelId,
            @RequestParam Long senderId,
            @RequestParam MultipartFile file) {
        return ResponseEntity.ok(
                chatService.saveFileMessage(roomId, channelId, senderId, file));
    }

    @GetMapping("/files/{messageId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long messageId) {
        return chatService.downloadFile(messageId);
    }

    @PostMapping("/dm/file")
    public ResponseEntity<DirectMessageResponse> uploadDmFile(
            @RequestParam Long roomId,
            @RequestParam Long senderId,
            @RequestParam Long receiverId,
            @RequestParam MultipartFile file) {
        return ResponseEntity.ok(
                chatService.saveDmFileMessage(roomId, senderId, receiverId, file));
    }

    @GetMapping("/dm/files/{messageId}")
    public ResponseEntity<Resource> downloadDmFile(@PathVariable Long messageId) {
        return chatService.downloadDmFile(messageId);
    }

    // ChatController.java 예시
    @PostMapping("/rooms/{roomId}/leave")
    public ResponseEntity<String> leaveRoom(
            @PathVariable Long roomId,
            @RequestParam Long userId) {

        // 서비스 단에서 해당 방의 참가자 매핑 테이블(RoomParticipant 등)에서 유저 삭제 로직 실행
        chatService.leaveRoom(roomId, userId);

        return ResponseEntity.ok("퇴장 완료");
    }
}