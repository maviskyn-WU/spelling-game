import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play, CheckCircle, XCircle, Sparkles, Lightbulb, SkipForward, Send, Lock, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Web Audio API Sound Effects ---
let audioCtx: AudioContext | null = null;

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const playPop = () => playTone(800, 'sine', 0.1, 0.1);
const playUnpop = () => playTone(400, 'sine', 0.1, 0.1);
const playCorrectWordSound = () => {
  playTone(523.25, 'triangle', 0.1, 0.1);
  setTimeout(() => playTone(659.25, 'triangle', 0.15, 0.1), 100);
};
const playSuccessSound = () => {
  playTone(440, 'sine', 0.15, 0.1);
  setTimeout(() => playTone(554.37, 'sine', 0.15, 0.1), 100);
  setTimeout(() => playTone(659.25, 'sine', 0.3, 0.1), 200);
};
const playErrorSound = () => {
  playTone(300, 'sawtooth', 0.2, 0.1);
  setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 150);
};
const playSpellingErrorSound = () => {
  playTone(200, 'square', 0.15, 0.1);
  setTimeout(() => playTone(150, 'square', 0.2, 0.1), 150);
};
const playWinSound = () => {
  // Magical arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 'sine', 0.15, 0.1), i * 100);
  });
  setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.15), notes.length * 100);
};

const triggerWinEffect = () => {
  playWinSound();
  
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults, particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24']
    });
    confetti({
      ...defaults, particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24']
    });
  }, 250);
};

// --- Game Data ---
const wordData: Record<string, string[]> = {
  "Level 1 (Clothes)": ["bracelet", "button", "collar", "fashion", "jacket", "jewellery", "pocket", "raincoat", "sweater", "uniform"],
  "Level 2 (Daily Life)": ["alarm", "blanket", "comb", "cushion", "mirror", "pillow", "shampoo", "soap", "towel", "toothbrush"],
  "Level 3 (Entertainment)": ["audience", "channel", "comedy", "concert", "festival", "gallery", "magazine", "orchestra", "stage", "ticket"],
  "Level 4 (Food & Drink)": ["biscuit", "cabbage", "carrot", "cheese", "garlic", "honey", "mushroom", "pepper", "sausage", "yogurt"],
  "Level 5 (Health)": ["ambulance", "bandage", "blood", "clinic", "cough", "dentist", "medicine", "patient", "pharmacy", "stomach"],
  "Level 6 (Hobbies)": ["camping", "chess", "collection", "fiction", "guitar", "painting", "photography", "puzzle", "sculpture", "tournament"],
  "Level 7 (House & Home)": ["balcony", "basement", "ceiling", "chimney", "cupboard", "drawer", "furniture", "garage", "roof", "stairs"],
  "Level 8 (Feelings)": ["anxious", "cheerful", "confident", "curious", "disappointed", "embarrassed", "jealous", "miserable", "nervous", "proud"],
  "Level 9 (Places)": ["cathedral", "factory", "library", "mosque", "museum", "palace", "stadium", "temple", "university", "village"],
  "Level 10 (Shopping)": ["bargain", "cash", "change", "checkout", "customer", "discount", "receipt", "refund", "wallet", "window"],
  "Level 11 (Sport)": ["athlete", "champion", "coach", "court", "match", "medal", "referee", "score", "tournament", "trophy"],
  "Level 12 (Technology)": ["battery", "charger", "keyboard", "laptop", "password", "printer", "screen", "software", "tablet", "website"],
  "Level 13 (Travel)": ["airport", "baggage", "border", "customs", "flight", "luggage", "passenger", "passport", "platform", "suitcase"],
  "Level 14 (Weather)": ["breeze", "cloud", "freezing", "hurricane", "lightning", "shower", "storm", "sunshine", "temperature", "thunder"],
  "Level 15 (Work & Jobs)": ["architect", "assistant", "builder", "engineer", "farmer", "manager", "mechanic", "plumber", "scientist", "secretary"]
};

type Bubble = { id: string; letter: string };
type GamePhase = 'menu' | 'spelling' | 'puzzle';

const CINNAMOROLL_WALLPAPERS = [
  "https://wallpapers.com/images/hd/cinnamoroll-cherish-kindness-quote-788999om0imgpbf9.jpg",
  "https://4kwallpapers.com/images/wallpapers/cinnamoroll-cute-cartoon-2560x1080-11708.png",
  "https://i.pinimg.com/474x/e7/77/11/e77711cca688a22e98fe19b75319cf0a.jpg",
  "https://wallpapersok.com/images/thumbnail/cinnamoroll-desktop-1250-x-768-azwaqdgg5cs76yg3.jpg",
  "https://i.pinimg.com/236x/b6/32/74/b63274045079eab42c70211a9bb63393.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTufrj3NDZs98R4izGC84bclqVCbdPK-1svJw&s",
  "https://mrwallpaper.com/images/hd/cinnamoroll-sweet-galaxy-8c3ya9fxy48py5jf.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUeWM6fR1xdSByQbKd5RadP2CZW1C73XYxLQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcgG1NKEhbmAvRNQyQvMpq0xqAQbxPANMZWA&s"
];

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState<string>(Object.keys(wordData)[0]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [currentWallpaper, setCurrentWallpaper] = useState<string>(CINNAMOROLL_WALLPAPERS[0]);
  
  const [currentWord, setCurrentWord] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  
  // No-repeat question tracking
  const remainingWordsRef = useRef<string[]>([]);
  const [remainingCount, setRemainingCount] = useState<number>(0);
  const [totalWords, setTotalWords] = useState<number>(0);
  
  // Puzzle State
  const [unlockedPieces, setUnlockedPieces] = useState<number[]>([]);
  const [puzzlePieces, setPuzzlePieces] = useState<number[]>([]);
  const [selectedPieceIdx, setSelectedPieceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [puzzleSolved, setPuzzleSolved] = useState<boolean>(false);
  
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [answerSlots, setAnswerSlots] = useState<Bubble[]>([]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "點擊開始" });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const playAudio = useCallback((wordToPlay: string = currentWord) => {
    if (!wordToPlay) return;
    
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(wordToPlay);
    msg.lang = 'en-US'; 
    msg.rate = 0.8;
    
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    const preferredVoice = englishVoices.find(v => v.name.includes('Google US English')) 
                        || englishVoices.find(v => v.name.includes('Samantha'))
                        || englishVoices.find(v => v.lang === 'en-US') 
                        || englishVoices[0];
                        
    if (preferredVoice) {
      msg.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(msg);
  }, [currentWord, voices]);

  const startPuzzlePhase = useCallback(() => {
    playWinSound();
    setFeedback({ type: 'success', message: '恭喜解鎖所有拼圖！拖曳或點擊拼圖來交換位置，完成圖案吧！' });
    
    setGamePhase('puzzle');
    setPuzzleSolved(false);
    setSelectedPieceIdx(null);
  }, []);

  const nextWord = useCallback(() => {
    if (remainingWordsRef.current.length === 0) {
      startPuzzlePhase();
      return;
    }

    const randomWord = remainingWordsRef.current[0];
    remainingWordsRef.current = remainingWordsRef.current.slice(1);
    setRemainingCount(remainingWordsRef.current.length);
    setCurrentWord(randomWord);
    
    // Generate bubbles: correct letters + 3 random decoys
    const wordLetters = randomWord.split('');
    const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
    const decoys = Array.from({ length: 3 }).map(() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    const allLetters = [...wordLetters, ...decoys];
    
    // Fisher-Yates Shuffle
    for (let i = allLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]];
    }
    
    const bubbleObjects = allLetters.map((l, i) => ({
      id: `bubble-${Date.now()}-${i}`,
      letter: l
    }));
    
    setBubbles(bubbleObjects);
    setAnswerSlots([]);
    setHintUsed(false);
    setElapsedTime(0);
    setIsTimerRunning(true);
    setFeedback({ type: null, message: "點擊泡泡拼出單字！" });
    playAudio(randomWord);
  }, [playAudio, startPuzzlePhase]);

  const startGame = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    setGamePhase('spelling');
    setScore(0);
    setUnlockedPieces([]);
    setCurrentWallpaper(CINNAMOROLL_WALLPAPERS[Math.floor(Math.random() * CINNAMOROLL_WALLPAPERS.length)]);
    
    const words = [...wordData[selectedLevel]].sort(() => Math.random() - 0.5);
    remainingWordsRef.current = words;
    setTotalWords(words.length);
    setRemainingCount(words.length);
    
    // Generate scrambled pieces
    const pieces = Array.from({ length: words.length }, (_, i) => i);
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    setPuzzlePieces(pieces);
    
    nextWord();
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setSelectedLevel(newLevel);
    if (gamePhase === 'spelling') {
      setScore(0);
      setUnlockedPieces([]);
      setCurrentWallpaper(CINNAMOROLL_WALLPAPERS[Math.floor(Math.random() * CINNAMOROLL_WALLPAPERS.length)]);
      
      const words = [...wordData[newLevel]].sort(() => Math.random() - 0.5);
      remainingWordsRef.current = words;
      setTotalWords(words.length);
      setRemainingCount(words.length);
      
      // Generate scrambled pieces
      const pieces = Array.from({ length: words.length }, (_, i) => i);
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      setPuzzlePieces(pieces);
      
      nextWord();
    }
  };

  const handleBubbleClick = useCallback((bubble: Bubble) => {
    if (feedback.type !== null || answerSlots.length >= currentWord.length) return;
    playPop();
    setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    setAnswerSlots(prev => [...prev, bubble]);
  }, [feedback.type, answerSlots.length, currentWord.length]);

  const handleSlotClick = useCallback((slot: Bubble) => {
    if (feedback.type !== null) return;
    playUnpop();
    setAnswerSlots(prev => prev.filter(s => s.id !== slot.id));
    setBubbles(prev => [...prev, slot]);
  }, [feedback.type]);

  const submitWord = useCallback(() => {
    if (answerSlots.length === 0) return;

    const spelledWord = answerSlots.map(s => s.letter).join('').toLowerCase();

    if (spelledWord === currentWord.toLowerCase()) {
      setIsTimerRunning(false);
      playCorrectWordSound();
      
      // Unlock a random piece
      const availablePieces = Array.from({ length: totalWords }, (_, i) => i).filter(i => !unlockedPieces.includes(i));
      if (availablePieces.length > 0) {
        setTimeout(() => playSuccessSound(), 300);
        const randomPiece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
        setUnlockedPieces(prev => [...prev, randomPiece]);
      }

      setScore(prev => prev + (hintUsed ? 1 : 2));
      setFeedback({ type: 'success', message: `答對了！獲得一塊拼圖！` });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f472b6', '#c084fc', '#60a5fa']
      });

      setTimeout(() => {
        nextWord();
      }, 2000);
    } else {
      playSpellingErrorSound();
      setFeedback({ type: 'error', message: `拼錯囉，再試一次！` });
      setTimeout(() => {
        setBubbles(prev => [...prev, ...answerSlots]);
        setAnswerSlots([]);
        setFeedback({ type: null, message: "點擊泡泡拼出單字！" });
      }, 1500);
    }
  }, [answerSlots, currentWord, nextWord, hintUsed]);

  const handleVirtualKey = useCallback((key: string) => {
    if (feedback.type !== null || gamePhase !== 'spelling') return;

    if (key === 'Enter') {
      submitWord();
    } else if (key === 'Backspace') {
      if (answerSlots.length > 0) {
        const lastSlot = answerSlots[answerSlots.length - 1];
        handleSlotClick(lastSlot);
      }
    } else if (/^[a-zA-Z]$/.test(key)) {
      const bubbleIdx = bubbles.findIndex(b => b.letter.toLowerCase() === key.toLowerCase());
      if (bubbleIdx !== -1 && answerSlots.length < currentWord.length) {
        handleBubbleClick(bubbles[bubbleIdx]);
      }
    }
  }, [feedback.type, gamePhase, answerSlots, bubbles, currentWord.length, submitWord, handleSlotClick, handleBubbleClick]);

  const handleHint = () => {
    if (feedback.type !== null) return;
    
    const targetLength = Math.min(answerSlots.length + 1, currentWord.length);
    const correctPrefix = currentWord.slice(0, targetLength).toLowerCase().split('');
    
    const allCurrentBubbles = [...bubbles, ...answerSlots];
    const newAnswerSlots: Bubble[] = [];
    const newBubbles: Bubble[] = [...allCurrentBubbles];
    
    correctPrefix.forEach(char => {
      const foundIdx = newBubbles.findIndex(b => b.letter.toLowerCase() === char);
      if (foundIdx !== -1) {
        newAnswerSlots.push(newBubbles[foundIdx]);
        newBubbles.splice(foundIdx, 1);
      }
    });
    
    setAnswerSlots(newAnswerSlots);
    setBubbles(newBubbles);
    setHintUsed(true);
  };

  const handleSkip = () => {
    if (feedback.type !== null) return;
    setIsTimerRunning(false);
    playErrorSound();
    setFeedback({ type: 'error', message: `跳過！正確是: ${currentWord}` });
    
    // Put the word back at the end of the queue so they have to answer it later to get the puzzle piece
    remainingWordsRef.current.push(currentWord);
    
    setTimeout(() => {
      nextWord();
    }, 2000);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (puzzleSolved) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setSelectedPieceIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx === index) {
      setDragOverIdx(null);
    }
  };

  const handleDragEnd = () => {
    setSelectedPieceIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (puzzleSolved) return;
    
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (sourceIndexStr === '') return;
    
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) {
      setSelectedPieceIdx(null);
      return;
    }

    playPop();
    const newPieces = [...puzzlePieces];
    [newPieces[sourceIndex], newPieces[targetIndex]] = [newPieces[targetIndex], newPieces[sourceIndex]];
    setPuzzlePieces(newPieces);
    setSelectedPieceIdx(null);

    // Check win condition
    if (newPieces.every((p, i) => p === i)) {
      setPuzzleSolved(true);
      triggerWinEffect();
      setFeedback({ type: 'success', message: '太棒了！你完成了大耳狗拼圖！' });
    }
  };

  const handlePuzzlePieceClick = (index: number) => {
    if (puzzleSolved) return;
    playPop();
    
    if (selectedPieceIdx === null) {
      setSelectedPieceIdx(index);
    } else {
      const newPieces = [...puzzlePieces];
      [newPieces[selectedPieceIdx], newPieces[index]] = [newPieces[index], newPieces[selectedPieceIdx]];
      setPuzzlePieces(newPieces);
      setSelectedPieceIdx(null);

      // Check win condition
      if (newPieces.every((p, i) => p === i)) {
        setPuzzleSolved(true);
        triggerWinEffect();
        setFeedback({ type: 'success', message: '太棒了！你完成了大耳狗拼圖！' });
      }
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== 'spelling') return;
      if (e.key === 'Backspace' || e.key === 'Enter') {
        if (feedback.type === null) {
          e.preventDefault();
        }
      }
      handleVirtualKey(e.key);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gamePhase, handleVirtualKey, feedback.type]);

  // Render Puzzle Grid
  const renderPuzzleGrid = (interactive: boolean) => {
    const cols = totalWords === 10 ? 5 : 4;
    const rows = Math.ceil(totalWords / cols) || 1;

    return (
      <div 
        className="grid gap-1 mx-auto w-full max-w-2xl bg-pink-200 p-2 rounded-xl shadow-inner mb-6"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          aspectRatio: `${cols} / ${rows}`
        }}
      >
        {Array.from({ length: totalWords }).map((_, i) => {
          const pieceId = puzzlePieces[i] ?? i;
          const isEarned = interactive || unlockedPieces.includes(i);
          const isSelected = interactive && selectedPieceIdx === i;
          const isDragOver = interactive && dragOverIdx === i;
          
          const bgPosX = cols > 1 ? (pieceId % cols) * (100 / (cols - 1)) : 0;
          const bgPosY = rows > 1 ? Math.floor(pieceId / cols) * (100 / (rows - 1)) : 0;

          return (
            <div 
              key={i}
              draggable={interactive && !puzzleSolved}
              onDragStart={(e) => interactive && handleDragStart(e, i)}
              onDragOver={(e) => interactive && handleDragOver(e, i)}
              onDragLeave={(e) => interactive && handleDragLeave(e, i)}
              onDragEnd={interactive ? handleDragEnd : undefined}
              onDrop={(e) => interactive && handleDrop(e, i)}
              onClick={() => interactive && handlePuzzlePieceClick(i)}
              className={`
                relative w-full h-full rounded-md overflow-hidden transition-all duration-200
                bg-white shadow-sm
                ${isSelected ? 'ring-4 ring-fuchsia-500 scale-95 opacity-70 z-10' : ''}
                ${isDragOver && !isSelected ? 'ring-4 ring-emerald-400 scale-105 z-20 shadow-xl' : ''}
                ${interactive && !puzzleSolved ? 'cursor-grab active:cursor-grabbing hover:scale-[0.98]' : ''}
              `}
            >
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${currentWallpaper})`,
                  backgroundSize: `${cols * 100}% ${rows * 100}%`,
                  backgroundPosition: `${bgPosX}% ${bgPosY}%`
                }}
              />
              {!isEarned && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white backdrop-blur-[1px]">
                  <Lock size={24} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-pink-100 to-purple-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-3xl shadow-2xl max-w-4xl w-full text-center border-4 border-white">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-fuchsia-400" size={28} />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-500">
              大耳狗泡泡拼字
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="level-select" className="text-pink-600 font-bold text-sm sm:text-base">選擇關卡：</label>
            <select 
              id="level-select" 
              value={selectedLevel}
              onChange={handleLevelChange}
              disabled={gamePhase === 'puzzle'}
              className="bg-pink-50 border-2 border-pink-200 text-pink-800 rounded-xl px-3 py-1 focus:outline-none focus:ring-4 focus:ring-pink-500/20 font-bold disabled:opacity-50"
            >
              {Object.keys(wordData).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        {gamePhase === 'menu' && (
          <div className="flex flex-col items-center w-full py-8">
            <div className="text-6xl mb-6 animate-bounce">🦄</div>
            <p className="text-lg text-pink-600 font-bold mb-8">拼出單字，收集拼圖，完成大耳狗的畫像！</p>
            <button 
              onClick={startGame}
              className="w-full max-w-md bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 text-2xl cursor-pointer"
            >
              <Play size={32} fill="currentColor" />
              開始測驗
            </button>
          </div>
        )}

        {gamePhase === 'spelling' && (
          <>
            {renderPuzzleGrid(false)}

            {/* Feedback Area */}
            <div className="mb-4 min-h-[40px] flex items-center justify-center">
              {feedback.type === 'success' && (
                <div className="flex items-center gap-2 text-emerald-500 text-xl sm:text-2xl font-bold animate-in slide-in-from-bottom-2">
                  <CheckCircle size={28} />
                  {feedback.message}
                </div>
              )}
              {feedback.type === 'error' && (
                <div className="flex items-center gap-2 text-rose-500 text-xl sm:text-2xl font-bold animate-in slide-in-from-bottom-2">
                  <XCircle size={28} />
                  {feedback.message}
                </div>
              )}
              {feedback.type === null && (
                <div className="text-pink-400 text-lg sm:text-xl font-bold animate-pulse flex items-center gap-2">
                  <Volume2 size={24} />
                  {feedback.message}
                </div>
              )}
            </div>

            {/* Answer Slots */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
              {Array.from({ length: currentWord.length }).map((_, i) => {
                const slot = answerSlots[i];
                const isError = feedback.type === 'error';
                const isSuccess = feedback.type === 'success';
                
                return (
                  <div 
                    key={i} 
                    onClick={() => slot && feedback.type === null && handleSlotClick(slot)}
                    className={`
                      w-12 h-14 sm:w-16 sm:h-20 border-b-4 flex items-center justify-center text-3xl sm:text-4xl font-bold uppercase rounded-t-xl
                      ${slot ? 'border-fuchsia-500 bg-fuchsia-100 text-fuchsia-700 cursor-pointer hover:bg-fuchsia-200 hover:-translate-y-1' : 'border-pink-200 bg-white/50 text-transparent'}
                      ${isError ? 'border-rose-400 bg-rose-100 text-rose-500 animate-shake' : ''}
                      ${isSuccess ? 'border-emerald-400 bg-emerald-100 text-emerald-600 animate-success-pop' : ''}
                      transition-all duration-200 shadow-sm
                    `}
                    style={isSuccess ? { animationDelay: `${i * 0.1}s` } : {}}
                  >
                    {slot ? slot.letter : ''}
                  </div>
                );
              })}
            </div>

            {/* Floating Letter Bubbles */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 p-4 bg-white/50 rounded-2xl border-2 border-pink-100 min-h-[100px] mb-8">
              {bubbles.map((bubble) => (
                <button
                  key={bubble.id}
                  onClick={() => handleBubbleClick(bubble)}
                  disabled={feedback.type !== null || answerSlots.length >= currentWord.length}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-black text-2xl sm:text-3xl shadow-lg hover:shadow-xl hover:-translate-y-2 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center animate-in zoom-in"
                >
                  {bubble.letter.toUpperCase()}
                </button>
              ))}
              {bubbles.length === 0 && answerSlots.length > 0 && feedback.type === null && (
                <div className="text-slate-400 font-bold flex items-center justify-center w-full">
                  請點擊送出答案！
                </div>
              )}
            </div>

            {/* Big Submit Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={submitWord}
                disabled={feedback.type !== null || answerSlots.length === 0}
                className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-500 text-white px-8 py-3 sm:px-12 sm:py-4 rounded-2xl font-black text-xl sm:text-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0"
              >
                <Send size={28} />
                送出答案 (Enter)
              </button>
            </div>

            {/* Action Bar (Score, Hint, Skip, Listen) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-4 mt-4 pt-6 border-t-2 border-pink-100">
              <div className="flex gap-2 sm:gap-3">
                <div className="text-base sm:text-lg font-bold text-pink-600 bg-pink-50 px-4 py-2 sm:px-6 sm:py-3 rounded-full border-2 border-pink-100 shadow-sm">
                  分數: <span className="text-xl sm:text-2xl text-fuchsia-600 ml-1 sm:ml-2">{score}</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-sky-600 bg-sky-50 px-4 py-2 sm:px-6 sm:py-3 rounded-full border-2 border-sky-100 shadow-sm">
                  進度: <span className="text-xl sm:text-2xl text-blue-600 ml-1 sm:ml-2">{totalWords - remainingCount}/{totalWords}</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-amber-600 bg-amber-50 px-4 py-2 sm:px-6 sm:py-3 rounded-full border-2 border-amber-100 shadow-sm flex items-center gap-1">
                  <Clock size={20} />
                  <span className="text-xl sm:text-2xl text-orange-500 ml-1">{elapsedTime}s</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <button 
                  onClick={handleHint}
                  disabled={feedback.type !== null || answerSlots.length === currentWord.length}
                  className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 sm:px-5 sm:py-3 rounded-full font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer hover:-translate-y-1 active:translate-y-0 text-sm sm:text-base"
                >
                  <Lightbulb size={20} />
                  提示
                </button>

                <button 
                  onClick={handleSkip}
                  disabled={feedback.type !== null}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 sm:px-5 sm:py-3 rounded-full font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer hover:-translate-y-1 active:translate-y-0 text-sm sm:text-base"
                >
                  <SkipForward size={20} />
                  跳過
                </button>

                <button 
                  onClick={() => playAudio()}
                  disabled={feedback.type !== null}
                  className="flex items-center gap-1 bg-gradient-to-r from-fuchsia-400 to-pink-400 hover:from-fuchsia-500 hover:to-pink-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer hover:-translate-y-1 active:translate-y-0 text-sm sm:text-base"
                >
                  <Volume2 size={24} />
                  再聽一次
                </button>
              </div>
            </div>
          </>
        )}

        {gamePhase === 'puzzle' && (
          <div className="flex flex-col items-center w-full py-4 animate-in fade-in duration-500">
            {renderPuzzleGrid(true)}
            
            <div className="mb-6 min-h-[40px] flex items-center justify-center">
              {feedback.type === 'success' && (
                <div className="flex items-center gap-2 text-emerald-500 text-xl sm:text-2xl font-bold animate-in slide-in-from-bottom-2">
                  <CheckCircle size={28} />
                  {feedback.message}
                </div>
              )}
            </div>

            {puzzleSolved && (
              <button 
                onClick={() => setGamePhase('menu')}
                className="w-full max-w-md bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 text-xl cursor-pointer"
              >
                <Play size={24} fill="currentColor" />
                再玩一次
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
