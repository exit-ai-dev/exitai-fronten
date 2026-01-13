export function ExitotrinityLogo({ size = 200 }: { size?: number }) {
  return (
    <div
      className="exitotrinity-logo-container"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1000px"
      }}
    >
      {/* 3D Orbit Ring */}
      <div className="orbit-ring-wrapper" style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transformStyle: "preserve-3d"
      }}>
        <div className="orbit-ring" style={{
          width: `${size * 0.7}px`,
          height: `${size * 0.35}px`,
          border: `${size * 0.06}px solid #000`,
          borderRadius: "50%",
          position: "relative",
          animation: "orbit-rotate 4s linear infinite",
          transformStyle: "preserve-3d"
        }}>
          {/* Inner black border ring */}
          <div style={{
            position: "absolute",
            width: "calc(100% - 20%)",
            height: "calc(100% - 20%)",
            top: "10%",
            left: "10%",
            border: `${size * 0.03}px solid #000`,
            borderRadius: "50%",
            opacity: 0.6
          }} />
        </div>
      </div>

      {/* Core - Red and White Sphere */}
      <div className="core-sphere" style={{
        position: "absolute",
        width: `${size * 0.25}px`,
        height: `${size * 0.25}px`,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle at 30% 30%, #ffffff, #ff3333 40%, #cc0000)",
        borderRadius: "50%",
        boxShadow: `
          0 0 ${size * 0.1}px rgba(255, 51, 51, 0.5),
          0 0 ${size * 0.2}px rgba(255, 51, 51, 0.3),
          inset -${size * 0.02}px -${size * 0.02}px ${size * 0.04}px rgba(0, 0, 0, 0.3),
          inset ${size * 0.02}px ${size * 0.02}px ${size * 0.04}px rgba(255, 255, 255, 0.3)
        `,
        zIndex: 10
      }}>
        {/* White triangle highlight */}
        <div style={{
          position: "absolute",
          width: 0,
          height: 0,
          top: "35%",
          left: "35%",
          borderLeft: `${size * 0.04}px solid transparent`,
          borderRight: `${size * 0.04}px solid transparent`,
          borderBottom: `${size * 0.06}px solid rgba(255, 255, 255, 0.9)`,
          filter: "blur(1px)"
        }} />
      </div>

      {/* Text - éxitotrinity */}
      <div className="logo-text" style={{
        position: "absolute",
        bottom: `-${size * 0.15}px`,
        fontSize: `${size * 0.12}px`,
        fontFamily: "Georgia, serif",
        color: "#000",
        fontWeight: "normal",
        letterSpacing: `${size * 0.002}px`,
        textAlign: "center",
        width: "100%"
      }}>
        éxitotrinity
      </div>

      {/* Sparkle effect (optional decorative element from original logo) */}
      <div style={{
        position: "absolute",
        bottom: `-${size * 0.18}px`,
        right: `-${size * 0.05}px`,
        width: `${size * 0.04}px`,
        height: `${size * 0.04}px`,
        background: "radial-gradient(circle, #fff 20%, transparent 70%)",
        opacity: 0.8,
        animation: "sparkle 2s ease-in-out infinite"
      }}>
        <div style={{
          position: "absolute",
          width: "100%",
          height: "2px",
          background: "#fff",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)"
        }} />
        <div style={{
          position: "absolute",
          width: "2px",
          height: "100%",
          background: "#fff",
          left: "50%",
          top: 0,
          transform: "translateX(-50%)"
        }} />
      </div>

      <style>{`
        @keyframes orbit-rotate {
          0% {
            transform: rotateX(60deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(60deg) rotateY(360deg);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
