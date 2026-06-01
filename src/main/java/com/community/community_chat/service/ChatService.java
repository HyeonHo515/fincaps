package com.community.community_chat.service;

import com.community.community_chat.dto.*;
import com.community.community_chat.entity.*;
import com.community.community_chat.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpHeaders;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

        private final ChatRoomRepository chatRoomRepository;
        private final ChatChannelRepository chatChannelRepository;
        private final ChatMessageRepository chatMessageRepository;
        private final UserRepository userRepository;
        private final ChatRoomMemberRepository chatRoomMemberRepository;
        private final DirectMessageRepository directMessageRepository;

        public List<ChatRoomResponse> getRooms() {
                return chatRoomRepository.findAll()
                                .stream()
                                .map(room -> new ChatRoomResponse(
                                                room.getRoomId(),
                                                room.getRoomName(),
                                                room.getInviteCode(),
                                                room.getOwner().getUserId(),
                                                room.getOwner().getName()))
                                .toList();
        }

        public List<ChatRoomResponse> getRooms(Long userId) {
                return chatRoomRepository.findRoomsByUserId(userId)
                                .stream()
                                .map(room -> new ChatRoomResponse(
                                                room.getRoomId(),
                                                room.getRoomName(),
                                                room.getInviteCode(),
                                                room.getOwner().getUserId(),
                                                room.getOwner().getName()))
                                .toList();
        }

        public List<ChatChannelResponse> getChannels(Long roomId) {
                return chatChannelRepository.findByRoomRoomId(roomId)
                                .stream()
                                .map(channel -> new ChatChannelResponse(
                                                channel.getChannelId(),
                                                channel.getRoom().getRoomId(),
                                                channel.getChannelName()))
                                .toList();
        }

        public List<ChatMessageResponse> getMessages(Long channelId) {
                return chatMessageRepository.findByChannelChannelIdOrderByCreatedAtAsc(channelId)
                                .stream()
                                .map(this::toMessageResponse)
                                .toList();
        }

        public ChatMessageResponse saveMessage(ChatMessageRequest request) {
                ChatRoom room = chatRoomRepository.findById(request.getRoomId())
                                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

                ChatChannel channel = chatChannelRepository.findById(request.getChannelId())
                                .orElseThrow(() -> new RuntimeException("채널을 찾을 수 없습니다."));

                User sender = userRepository.findById(request.getSenderId())
                                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                ChatMessage message = new ChatMessage();
                message.setRoom(room);
                message.setChannel(channel);
                message.setSender(sender);
                message.setMessageType("TEXT");
                message.setContent(request.getContent());
                message.setCreatedAt(LocalDateTime.now());

                ChatMessage saved = chatMessageRepository.save(message);

                return toMessageResponse(saved);
        }

        public ChatRoomResponse createRoom(ChatRoomCreateRequest request) {
                User owner = userRepository.findById(request.getOwnerId())
                                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                String inviteCode = "ROOM" + System.currentTimeMillis();

                ChatRoom room = new ChatRoom();
                room.setRoomName(request.getRoomName());
                room.setInviteCode(inviteCode);
                room.setOwner(owner);
                room.setCreatedAt(LocalDateTime.now());

                ChatRoom savedRoom = chatRoomRepository.save(room);

                ChatRoomMember member = new ChatRoomMember();
                member.setRoom(savedRoom);
                member.setUser(owner);
                member.setRole("HOST");
                member.setJoinedAt(LocalDateTime.now());
                chatRoomMemberRepository.save(member);

                ChatChannel channel = new ChatChannel();
                channel.setRoom(savedRoom);
                channel.setChannelName("일반");
                channel.setCreatedAt(LocalDateTime.now());
                chatChannelRepository.save(channel);

                return new ChatRoomResponse(
                                savedRoom.getRoomId(),
                                savedRoom.getRoomName(),
                                savedRoom.getInviteCode(),
                                owner.getUserId(),
                                owner.getName());
        }

        public ChatRoomResponse joinRoom(JoinRoomRequest request) {
                ChatRoom room = chatRoomRepository.findByInviteCode(request.getInviteCode())
                                .orElseThrow(() -> new RuntimeException("초대 코드가 올바르지 않습니다."));

                User user = userRepository.findById(request.getUserId())
                                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                boolean alreadyJoined = chatRoomMemberRepository.existsByRoomAndUser(room, user);

                if (!alreadyJoined) {
                        ChatRoomMember member = new ChatRoomMember();
                        member.setRoom(room);
                        member.setUser(user);
                        member.setRole("MEMBER");
                        member.setJoinedAt(LocalDateTime.now());
                        chatRoomMemberRepository.save(member);
                }

                return new ChatRoomResponse(
                                room.getRoomId(),
                                room.getRoomName(),
                                room.getInviteCode(),
                                room.getOwner().getUserId(),
                                room.getOwner().getName());
        }

        public List<UserResponse> getRoomMembers(Long roomId) {
                return chatRoomMemberRepository.findByRoomRoomId(roomId)
                                .stream()
                                .map(member -> new UserResponse(
                                                member.getUser().getUserId(),
                                                member.getUser().getLoginId(),
                                                member.getUser().getEmail(),
                                                member.getUser().getName(),
                                                member.getUser().getGrade(),
                                                member.getUser().getRole().name()))
                                .toList();
        }

        public List<DirectMessageResponse> getDirectMessages(Long roomId, Long userId, Long targetUserId) {
                return directMessageRepository
                                .findByRoomRoomIdAndSenderUserIdAndReceiverUserIdOrRoomRoomIdAndSenderUserIdAndReceiverUserIdOrderByCreatedAtAsc(
                                                roomId, userId, targetUserId,
                                                roomId, targetUserId, userId)
                                .stream()
                                .map(dm -> new DirectMessageResponse(
                                                dm.getDmId(),
                                                dm.getRoom().getRoomId(),
                                                dm.getSender().getUserId(),
                                                dm.getSender().getName(),
                                                dm.getReceiver().getUserId(),
                                                dm.getReceiver().getName(),
                                                dm.getContent(),
                                                dm.getMessageType(),
                                                dm.getFileName(),
                                                "/api/chat/dm/files/" + dm.getDmId(),
                                                dm.getCreatedAt()))
                                .toList();
        }

        public DirectMessageResponse sendDirectMessage(DirectMessageRequest request) {
                ChatRoom room = chatRoomRepository.findById(request.getRoomId())
                                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

                User sender = userRepository.findById(request.getSenderId())
                                .orElseThrow(() -> new RuntimeException("보낸 사용자를 찾을 수 없습니다."));

                User receiver = userRepository.findById(request.getReceiverId())
                                .orElseThrow(() -> new RuntimeException("받는 사용자를 찾을 수 없습니다."));

                DirectMessage dm = new DirectMessage();
                dm.setRoom(room);
                dm.setSender(sender);
                dm.setReceiver(receiver);
                dm.setContent(request.getContent());
                dm.setMessageType("TEXT");
                dm.setCreatedAt(LocalDateTime.now());

                DirectMessage saved = directMessageRepository.save(dm);

                return new DirectMessageResponse(
                                saved.getDmId(),
                                room.getRoomId(),
                                sender.getUserId(),
                                sender.getName(),
                                receiver.getUserId(),
                                receiver.getName(),
                                saved.getContent(),
                                saved.getMessageType(),
                                saved.getFileName(),
                                "/api/chat/dm/files/" + saved.getDmId(),
                                saved.getCreatedAt());
        }

        private ChatMessageResponse toMessageResponse(ChatMessage message) {
                return new ChatMessageResponse(
                                message.getMessageId(),
                                message.getRoom().getRoomId(),
                                message.getChannel().getChannelId(),
                                message.getSender().getUserId(),
                                message.getSender().getName(),
                                message.getContent(),
                                message.getMessageType(),
                                message.getCreatedAt());
        }

        public FileUploadResponse saveFileMessage(Long roomId, Long channelId, Long senderId, MultipartFile file) {
                try {

                        ChatRoom room = chatRoomRepository.findById(roomId)
                                        .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

                        ChatChannel channel = chatChannelRepository.findById(channelId)
                                        .orElseThrow(() -> new RuntimeException("채널을 찾을 수 없습니다."));

                        User sender = userRepository.findById(senderId)
                                        .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                        String uploadDir = System.getProperty("user.dir")
                                        + File.separator + "uploads"
                                        + File.separator + "chat";

                        File dir = new File(uploadDir);

                        if (!dir.exists()) {
                                dir.mkdirs();
                        }

                        String originalFileName = file.getOriginalFilename();

                        String savedFileName = UUID.randomUUID() + "_" + originalFileName;

                        File savedFile = new File(dir, savedFileName);

                        file.transferTo(savedFile);

                        ChatMessage message = new ChatMessage();

                        message.setRoom(room);
                        message.setChannel(channel);
                        message.setSender(sender);

                        message.setContent(originalFileName);

                        message.setMessageType("FILE");

                        message.setFileName(originalFileName);

                        message.setFilePath(savedFile.getAbsolutePath());

                        message.setCreatedAt(LocalDateTime.now());

                        ChatMessage saved = chatMessageRepository.save(message);

                        return new FileUploadResponse(
                                        saved.getMessageId(),
                                        room.getRoomId(),
                                        channel.getChannelId(),
                                        sender.getUserId(),
                                        sender.getName(),
                                        saved.getContent(),
                                        saved.getMessageType(),
                                        saved.getFileName(),
                                        "/api/chat/files/" + saved.getMessageId(),
                                        saved.getCreatedAt().toString());

                } catch (Exception e) {
                        e.printStackTrace();
                        throw new RuntimeException("파일 업로드 실패", e);
                }
        }

        public ResponseEntity<Resource> downloadFile(Long messageId) {
                try {
                        ChatMessage message = chatMessageRepository.findById(messageId)
                                        .orElseThrow(() -> new RuntimeException("파일 메시지를 찾을 수 없습니다."));

                        Path path = Paths.get(message.getFilePath());
                        Resource resource = new UrlResource(path.toUri());

                        return ResponseEntity.ok()
                                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                                        "attachment; filename=\""
                                                                        + URLEncoder.encode(message.getFileName(),
                                                                                        StandardCharsets.UTF_8)
                                                                        + "\"")
                                        .body(resource);

                } catch (Exception e) {
                        throw new RuntimeException("파일 다운로드 실패", e);
                }
        }

        public DirectMessageResponse saveDmFileMessage(
                        Long roomId,
                        Long senderId,
                        Long receiverId,
                        MultipartFile file) {
                try {

                        ChatRoom room = chatRoomRepository.findById(roomId)
                                        .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

                        User sender = userRepository.findById(senderId)
                                        .orElseThrow(() -> new RuntimeException("보낸 사용자를 찾을 수 없습니다."));

                        User receiver = userRepository.findById(receiverId)
                                        .orElseThrow(() -> new RuntimeException("받는 사용자를 찾을 수 없습니다."));

                        String uploadDir = System.getProperty("user.dir")
                                        + File.separator + "uploads"
                                        + File.separator + "dm";

                        File dir = new File(uploadDir);

                        if (!dir.exists()) {
                                dir.mkdirs();
                        }

                        String originalFileName = file.getOriginalFilename();

                        String savedFileName = UUID.randomUUID() + "_" + originalFileName;

                        File savedFile = new File(dir, savedFileName);

                        file.transferTo(savedFile);

                        DirectMessage dm = new DirectMessage();

                        dm.setRoom(room);
                        dm.setSender(sender);
                        dm.setReceiver(receiver);

                        dm.setContent(originalFileName);

                        dm.setMessageType("FILE");

                        dm.setFileName(originalFileName);

                        dm.setFilePath(savedFile.getAbsolutePath());

                        dm.setCreatedAt(LocalDateTime.now());

                        DirectMessage saved = directMessageRepository.save(dm);

                        return new DirectMessageResponse(
                                        saved.getDmId(),
                                        room.getRoomId(),
                                        sender.getUserId(),
                                        sender.getName(),
                                        receiver.getUserId(),
                                        receiver.getName(),
                                        saved.getContent(),
                                        saved.getMessageType(),
                                        saved.getFileName(),
                                        "/api/chat/dm/files/" + saved.getDmId(),
                                        saved.getCreatedAt());

                } catch (Exception e) {
                        e.printStackTrace();
                        throw new RuntimeException("DM 파일 업로드 실패", e);
                }
        }

        public ResponseEntity<Resource> downloadDmFile(Long messageId) {
                try {

                        DirectMessage dm = directMessageRepository.findById(messageId)
                                        .orElseThrow(() -> new RuntimeException("DM 파일을 찾을 수 없습니다."));

                        Path path = Paths.get(dm.getFilePath());

                        Resource resource = new UrlResource(path.toUri());

                        return ResponseEntity.ok()
                                        .header(
                                                        HttpHeaders.CONTENT_DISPOSITION,
                                                        "attachment; filename=\""
                                                                        + URLEncoder.encode(
                                                                                        dm.getFileName(),
                                                                                        StandardCharsets.UTF_8)
                                                                        + "\"")
                                        .body(resource);

                } catch (Exception e) {
                        throw new RuntimeException("DM 파일 다운로드 실패", e);
                }
        }

        @org.springframework.transaction.annotation.Transactional
        public void leaveRoom(Long roomId, Long userId) {
                try {
                        chatRoomMemberRepository.deleteByRoomRoomIdAndUserUserId(roomId, userId);

                        System.out.println("[DB 퇴장 완료] Room ID: " + roomId + ", User ID: " + userId);

                } catch (Exception e) {
                        throw new RuntimeException("채팅방을 나가는 도중 오류가 발생했습니다: " + e.getMessage());
                }
        }
}