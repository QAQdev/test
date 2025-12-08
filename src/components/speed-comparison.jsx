import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaRedo, FaCogs } from 'react-icons/fa';

// 配置常量：5x5 网格
const GRID_ROWS = 2;
const GRID_COLS = 2;
const TOTAL_IMAGES = GRID_ROWS * GRID_COLS;

// 默认快进倍速
const DEFAULT_SPEED_MULTIPLIER = 10;

// 速度配置 (秒/张)
const SPEEDS = {
  QWEN: 36.55,
  OURS_2_NFE: 1.21,
  OURS_4_NFE: 2.32,
};

const ModelGrid = ({
  title,
  subTitle,
  timePerImage,
  isRunning,
  speedMultiplier,
  baseColor,
  imageFolder,
}) => {
  // UI State
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Refs 用于在 requestAnimationFrame 循环中保持最新状态，防止闭包陷阱
  const stateRef = useRef({
    currentIndex: -1,
    progress: 0,
    completed: 0,
    elapsed: 0,
  });

  // 追踪 props 的最新值
  const multiplierRef = useRef(speedMultiplier);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    multiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const rafRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    // --- 停止/重置逻辑 ---
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;

      // 重置内部状态
      stateRef.current = {
        currentIndex: -1,
        progress: 0,
        completed: 0,
        elapsed: 0,
      };

      // 重置 UI
      setCurrentIndex(-1);
      setCurrentProgress(0);
      setCompletedCount(0);
      setElapsedTime(0);
      return;
    }

    // --- 开始逻辑 ---
    // 初始化状态
    stateRef.current.currentIndex = 0;
    setCurrentIndex(0);
    lastTickRef.current = Date.now();

    const animate = () => {
      // 双重保险：如果 ref 状态显示已停止，强制退出循环
      if (!isRunningRef.current) return;

      const now = Date.now();
      const delta = now - (lastTickRef.current || now);
      lastTickRef.current = now;

      const { completed, progress, elapsed } = stateRef.current;
      const currentMultiplier = multiplierRef.current; // 使用 Ref 获取最新倍速

      // 如果全部完成，停止更新
      if (completed >= TOTAL_IMAGES) {
        return;
      }

      // 更新总耗时 (显示用，基于真实流逝时间 * 倍速)
      const newElapsed = elapsed + delta * currentMultiplier;
      stateRef.current.elapsed = newElapsed;
      setElapsedTime(newElapsed);

      // 计算当前图片进度
      // 目标时间 (ms)
      const targetMs = timePerImage * 1000;
      // 进度增量 = (经过时间 * 倍速 / 目标时间) * 100
      const increment = ((delta * currentMultiplier) / targetMs) * 100;
      const newProgress = progress + increment;

      if (newProgress >= 100) {
        // 单张完成
        stateRef.current.completed += 1;
        stateRef.current.currentIndex += 1;
        stateRef.current.progress = 0;

        setCompletedCount(stateRef.current.completed);
        setCurrentIndex(stateRef.current.currentIndex);
        setCurrentProgress(0);
      } else {
        // 进行中
        stateRef.current.progress = newProgress;
        setCurrentProgress(newProgress);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, timePerImage]);

  // 浅色主题样式
  const styles = {
    container: {
      border: `1px solid ${completedCount === TOTAL_IMAGES ? '#4caf50' : '#e5e5e5'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: '#ffffff', // 纯白背景
      color: '#333',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease',
    },
    header: {
      padding: '12px 15px',
      background: '#f4f4f4', // 浅灰头部
      borderBottom: '1px solid #e5e5e5',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
      gap: '2px',
      padding: '10px',
      flex: 1,
      alignContent: 'start',
      background: '#fff',
    },
    cell: {
      aspectRatio: '1/1',
      position: 'relative',
      background: '#eee', // 图片加载前的占位灰
      borderRadius: '2px',
      overflow: 'hidden',
    },
    progressBar: {
      height: '4px',
      background: '#eee',
      width: '100%',
      borderRadius: '2px',
      marginTop: '8px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      background: baseColor,
      width: `${(completedCount / TOTAL_IMAGES) * 100}%`,
      transition: 'width 0.1s linear',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3
            style={{
              margin: 0,
              color: baseColor,
              fontSize: '1.1rem',
              fontWeight: '700',
            }}
          >
            {title}
          </h3>
          <p
            style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}
          >
            {subTitle}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '1.4rem',
              fontFamily: 'monospace',
              fontWeight: '600',
              color: '#333',
              lineHeight: 1,
            }}
          >
            {(elapsedTime / 1000).toFixed(1)}
            <span
              style={{ fontSize: '0.8rem', color: '#999', marginLeft: '2px' }}
            >
              s
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 15px' }}>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#888',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          <span>
            {completedCount}/{TOTAL_IMAGES} images
          </span>
          <span>~{timePerImage}s / img</span>
        </div>
      </div>

      <div style={styles.grid}>
        {Array.from({ length: TOTAL_IMAGES }).map((_, idx) => {
          const isDone = idx < completedCount;
          const isCurrent = idx === currentIndex;
          const isWaiting = idx > currentIndex;

          // 图片路径逻辑
          const imgSrc = `${imageFolder}/${idx + 1}.png`;

          return (
            <div key={idx} style={styles.cell}>
              {!isWaiting && (
                <img
                  src={imgSrc}
                  alt={`Gen ${idx}`}
                  onError={(e) => {
                    // 图片加载失败时隐藏，显示灰色背景
                    e.target.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    // 生成中：模糊+半透明；完成：清晰
                    filter: isDone ? 'none' : 'blur(2px) grayscale(50%)',
                    transition: 'filter 0.2s',
                    opacity: isDone ? 1 : 0.7,
                    display: 'block',
                  }}
                />
              )}

              {isCurrent && (
                // 单张图片进度条覆盖层
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    width: `${currentProgress}%`,
                    background: baseColor,
                    boxShadow: '0 0 4px rgba(255,255,255,0.5)',
                    zIndex: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function SpeedComparison() {
  const [isRunning, setIsRunning] = useState(false);
  const [nfe, setNfe] = useState(2); // Default to 2 NFE

  // 根据选择的 NFE 确定 Ours 模型的时间和图片路径
  const oursTime = nfe === 2 ? SPEEDS.OURS_2_NFE : SPEEDS.OURS_4_NFE;
  const oursFolder = `demo/ours_nfe_${nfe}`;

  const controlsStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  };

  const nfeButtonStyle = (value) => ({
    padding: '0 12px',
    height: '28px',
    lineHeight: '28px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    border: 'none',
    background: nfe === value ? '#333' : 'transparent',
    color: nfe === value ? '#fff' : '#666',
    fontWeight: nfe === value ? '600' : '400',
    transition: 'all 0.2s',
    borderRadius: '14px',
  });

  return (
    <div className="uk-section" style={{ background: '#ffffff' }}>
      <div className="uk-container uk-container-large">
        <h2
          className="uk-text-bold uk-heading-line uk-text-center"
          style={{ color: '#333', marginBottom: '40px' }}
        >
          <span>Generation Speed Comparison (1328×1328)</span>
        </h2>

        <div style={controlsStyle}>
          {/* Legend */}
          <div className="uk-flex uk-flex-middle">
            <span
              className="uk-label"
              style={{
                backgroundColor: '#1e87f0',
                marginRight: '10px',
                fontSize: '0.7rem',
              }}
            >
              Original
            </span>
            <span
              style={{ marginRight: '15px', color: '#666', fontSize: '0.9rem' }}
            >
              vs
            </span>
            <span
              className="uk-label"
              style={{ backgroundColor: '#4caf50', fontSize: '0.7rem' }}
            >
              Ours (Accelerated)
            </span>
          </div>

          {/* Controls */}
          <div className="uk-flex uk-flex-middle" style={{ gap: '15px' }}>
            {/* NFE Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#fff',
                padding: '4px',
                borderRadius: '30px',
                border: '1px solid #e5e5e5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '10px',
                  paddingRight: '5px',
                  gap: '6px',
                }}
              >
                <FaCogs style={{ color: '#888', fontSize: '0.9em' }} />
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#555',
                  }}
                >
                  NFE
                </span>
              </div>
              <div
                style={{
                  background: '#f5f5f5',
                  borderRadius: '15px',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setNfe(2);
                  }}
                  style={nfeButtonStyle(2)}
                >
                  2
                </button>
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setNfe(4);
                  }}
                  style={nfeButtonStyle(4)}
                >
                  4
                </button>
              </div>
            </div>

            {/* Start/Reset Button */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="uk-button"
              style={{
                borderRadius: '30px',
                minWidth: '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                // Start = Blue (#1e87f0), Reset = Red (#f0506e)
                backgroundColor: isRunning ? '#f0506e' : '#1e87f0',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'background-color 0.2s',
              }}
            >
              {isRunning ? (
                <>
                  <FaRedo /> Reset
                </>
              ) : (
                <>
                  <FaPlay /> Start (Click Me!)
                </>
              )}
            </button>
          </div>
        </div>

        <div
          className="uk-grid-match uk-child-width-1-2@m uk-grid-small"
          data-uk-grid
        >
          <div>
            <ModelGrid
              title="Qwen-Image 🦥"
              subTitle="Multi-step (50×2 NFEs)"
              timePerImage={SPEEDS.QWEN}
              isRunning={isRunning}
              speedMultiplier={DEFAULT_SPEED_MULTIPLIER}
              baseColor="#1e87f0" // Blue
              imageFolder="demo/qwen"
            />
          </div>
          <div>
            <ModelGrid
              title={`TwinFlow-Qwen-Image 🚀🚀🚀`}
              subTitle={`Few-step (${nfe} NFEs)`}
              timePerImage={oursTime}
              isRunning={isRunning}
              speedMultiplier={DEFAULT_SPEED_MULTIPLIER}
              baseColor="#4caf50" // Green
              imageFolder={oursFolder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
