package com.community.community_chat.service;

import com.community.community_chat.entity.WrongNote;
import com.community.community_chat.repository.WrongNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WrongNoteService {

    private final WrongNoteRepository wrongNoteRepository;

    public List<WrongNote> getAllNotes(String userId) {
        return wrongNoteRepository.findByUserIdOrderByIdDesc(normalizeUserId(userId));
    }

    public WrongNote saveNote(String userId, WrongNote note) {
        note.setUserId(normalizeUserId(userId));
        note.applyDefaults();
        return wrongNoteRepository.save(note);
    }

    public WrongNote updateNote(String userId, Long id, WrongNote request) {
        String normalizedUserId = normalizeUserId(userId);
        WrongNote note = wrongNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Wrong note not found: " + id));
        if (!normalizedUserId.equals(note.getUserId())) {
            throw new IllegalArgumentException("Wrong note does not belong to this user.");
        }

        note.setSubject(request.getSubject());
        note.setTitle(request.getTitle());
        note.setQ(request.getQ());
        note.setWrong(request.getWrong());
        note.setCorrect(request.getCorrect());
        note.setDate(request.getDate());
        note.setColor(request.getColor());
        note.setQuestionType(request.getQuestionType());
        note.setOptionsJson(request.getOptionsJson());
        note.setAnswerIdx(request.getAnswerIdx());
        note.setAnswerKeywordsJson(request.getAnswerKeywordsJson());
        note.setDebugSolved(request.isDebugSolved());
        note.setRelapsed(request.isRelapsed());
        note.setUserId(normalizedUserId);
        note.applyDefaults();

        return wrongNoteRepository.save(note);
    }

    public void deleteNote(String userId, Long id) {
        String normalizedUserId = normalizeUserId(userId);
        WrongNote note = wrongNoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Wrong note not found: " + id));
        if (!normalizedUserId.equals(note.getUserId())) {
            throw new IllegalArgumentException("Wrong note does not belong to this user.");
        }
        wrongNoteRepository.delete(note);
    }

    private String normalizeUserId(String userId) {
        return userId == null || userId.isBlank() ? "guest" : userId.trim();
    }
}
