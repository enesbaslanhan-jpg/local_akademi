import { describe, it, expect, beforeEach } from 'vitest';
import { saveMentorFeedback, getMentorFeedback } from './mentorFeedback';

describe('mentorFeedback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const testUser = { id: 'usr-123' };

  it('saves helpful feedback correctly', () => {
    const success = saveMentorFeedback(testUser, 'msg-1', 'helpful');
    expect(success).toBe(true);
    expect(getMentorFeedback(testUser, 'msg-1')).toBe('helpful');
  });

  it('saves not_helpful feedback correctly', () => {
    const success = saveMentorFeedback(testUser, 'msg-2', 'not_helpful');
    expect(success).toBe(true);
    expect(getMentorFeedback(testUser, 'msg-2')).toBe('not_helpful');
  });

  it('changes selection correctly', () => {
    saveMentorFeedback(testUser, 'msg-1', 'helpful');
    saveMentorFeedback(testUser, 'msg-1', 'not_helpful');
    expect(getMentorFeedback(testUser, 'msg-1')).toBe('not_helpful');
  });

  it('does not produce duplicate records for same selection', () => {
    saveMentorFeedback(testUser, 'msg-1', 'helpful');
    saveMentorFeedback(testUser, 'msg-1', 'helpful');
    expect(localStorage.length).toBe(1);
  });

  it('separates feedback when user scope changes', () => {
    saveMentorFeedback({ id: 'usr-123' }, 'msg-1', 'helpful');
    expect(getMentorFeedback({ id: 'usr-999' }, 'msg-1')).toBe(null);
  });

  it('works when localStorage throws', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
    
    const success = saveMentorFeedback(testUser, 'msg-3', 'helpful');
    expect(success).toBe(false);
    expect(getMentorFeedback(testUser, 'msg-3')).toBe(null);

    Storage.prototype.setItem = originalSetItem;
  });

  it('does not store message content in storage key or value', () => {
    saveMentorFeedback(testUser, 'msg-4', 'helpful');
    const key = localStorage.key(0);
    const val = localStorage.getItem(key);
    expect(key).not.toContain('content');
    expect(val).not.toContain('content');
    expect(key).toBe('mentor_feedback:usr_usr-123:msg-4');
    expect(JSON.parse(val).feedbackValue).toBe('helpful');
  });
});
