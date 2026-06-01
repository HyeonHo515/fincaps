package com.community.community_chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class FileUploadResponse {
    private Long messageId;
    private Long roomId;
    private Long channelId;
    private Long senderId;
    private String senderName;
    private String content;
    private String messageType;
    private String fileName;
    private String fileUrl;
    private String createdAt;
}