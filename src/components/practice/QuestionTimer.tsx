"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface QuestionTimerProps {
    timeLimit: number; // in seconds
    onTimeExpired: () => void;
    isPaused?: boolean;
    className?: string;
}

export function QuestionTimer({
    timeLimit,
    onTimeExpired,
    isPaused = false,
    className = ""
}: QuestionTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(timeLimit);
    const [hasAlerted10s, setHasAlerted10s] = useState(false);
    const [hasAlerted5s, setHasAlerted5s] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio on mount
    useEffect(() => {
        // Create a simple beep sound using Web Audio API
        audioRef.current = new Audio();
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Countdown logic
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    playBeep();
                    onTimeExpired();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, onTimeExpired]);

    // Alert logic
    useEffect(() => {
        if (timeRemaining === 10 && !hasAlerted10s) {
            playBeep();
            setHasAlerted10s(true);
        } else if (timeRemaining <= 5 && timeRemaining > 0) {
            // Beep every second from 5 down to 1
            // We need a way to track if we've beeped for this specific second
            // Since this effect runs on timeRemaining change, it should be fine
            playBeep();
            if (timeRemaining === 5) vibrateDevice();
        } else if (timeRemaining === 0) {
            playBeep();
            vibrateDevice([100, 50, 100]);
        }
    }, [timeRemaining, hasAlerted10s]);

    const playBeep = () => {
        try {
            // Create Web Audio API beep
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Frequency in Hz
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    };

    const vibrateDevice = (pattern: number | number[] = 200) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    };

    // Calculate percentage for circular progress
    const percentage = (timeRemaining / timeLimit) * 100;
    const strokeDashoffset = 283 - (283 * percentage) / 100; // 283 is circumference of r=45 circle

    // Color based on time remaining
    const getColor = () => {
        if (percentage > 50) return 'text-green-500';
        if (percentage > 20) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStrokeColor = () => {
        if (percentage > 50) return '#22c55e'; // green
        if (percentage > 20) return '#eab308'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg className="w-20 h-20 transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                />
                {/* Progress circle */}
                <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke={getStrokeColor()}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="226"
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-500 ${percentage <= 20 ? 'animate-pulse' : ''}`}
                    strokeLinecap="round"
                />
            </svg>
            {/* Timer text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className={`h-4 w-4 mb-1 ${getColor()}`} />
                <span className={`text-lg font-bold ${getColor()}`}>
                    {timeRemaining}s
                </span>
            </div>
        </div>
    );
}
