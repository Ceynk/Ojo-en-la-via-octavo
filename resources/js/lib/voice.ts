/** Wraps the Web Speech API to read turn-by-turn instructions out loud in Spanish. */
export function speak(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

export function isVoiceSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
