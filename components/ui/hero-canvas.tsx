"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { FlowButton } from "./flow-button";
import { LiquidMetalButton } from "./liquid-metal-button";
import { useRouter } from "next/navigation";

const AetherFlowHero = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: null as number | null, y: null as number | null, radius: 200 };

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(
        x: number,
        y: number,
        directionX: number,
        directionY: number,
        size: number,
        color: string
      ) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx!.fillStyle = this.color;
        ctx!.fill();
      }

      update() {
        if (this.x > canvas!.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas!.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 5;
            this.y -= forceDirectionY * force * 5;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particles = [];
      const numberOfParticles = (canvas!.height * canvas!.width) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (innerWidth - size * 2) + size * 2;
        const y = Math.random() * (innerHeight - size * 2) + size * 2;
        const directionX = Math.random() * 0.4 - 0.2;
        const directionY = Math.random() * 0.4 - 0.2;
        const color = "rgba(191, 128, 255, 0.8)";
        particles.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    const resizeCanvas = () => {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      init();
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const connect = () => {
      let opacityValue = 1;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const distance =
            (particles[a].x - particles[b].x) * (particles[a].x - particles[b].x) +
            (particles[a].y - particles[b].y) * (particles[a].y - particles[b].y);

          if (distance < (canvas!.width / 7) * (canvas!.height / 7)) {
            opacityValue = 1 - distance / 20000;

            const dxMouseA = particles[a].x - (mouse.x ?? 0);
            const dyMouseA = particles[a].y - (mouse.y ?? 0);
            const distanceMouseA = Math.sqrt(dxMouseA * dxMouseA + dyMouseA * dyMouseA);

            if (mouse.x && distanceMouseA < mouse.radius) {
              ctx!.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
            } else {
              ctx!.strokeStyle = `rgba(200, 150, 255, ${opacityValue})`;
            }

            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(particles[a].x, particles[a].y);
            ctx!.lineTo(particles[b].x, particles[b].y);
            ctx!.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx!.fillStyle = "black";
      ctx!.fillRect(0, 0, innerWidth, innerHeight);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2 + 0.5,
        duration: 0.8,
        ease: "easeInOut" as const,
      },
    }),
  };

  return (
    <header id="hero-root" className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <canvas id="hero-canvas" ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>

      <section id="hero-content" className="relative z-10 text-center p-6">
        {/* Brand badge */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-purple-300 font-medium">AI-Powered Mock Interview Coach</span>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-5xl md:text-8xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400"
        >
          HireReady AI
        </motion.h1>

        <motion.p
          custom={1.5}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-lg md:text-xl text-purple-300/80 font-medium mb-2"
        >
          Practice Smarter. Interview Better.
        </motion.p>

        <motion.p
          custom={2}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto text-base text-gray-400 mb-10"
        >
          Get personalized HR interview questions, real-time AI evaluation with scoring, adaptive follow-ups, and a detailed performance report — all powered by Generative AI.
        </motion.p>

        <motion.nav
          id="hero-actions"
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="mock-interview flex gap-4 justify-center items-center flex-wrap"
        >
          <div onClick={() => router.push("/interview")} className="cursor-pointer">
            <LiquidMetalButton label="Start Interview →" />
          </div>
          <div onClick={() => router.push("/prep")} className="cursor-pointer">
            <FlowButton text="Prepare Questions" />
          </div>
        </motion.nav>

        {/* Feature pills */}
        <motion.div
          custom={4}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2 justify-center mt-10"
        >
          {["🎯 Personalized Questions", "📊 AI Scoring", "🔄 Adaptive Follow-ups", "📋 Performance Report"].map((feature) => (
            <span
              key={feature}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </section>
    </header>
  );
};

export default AetherFlowHero;
