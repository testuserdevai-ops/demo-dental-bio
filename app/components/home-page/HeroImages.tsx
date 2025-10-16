"use client";
import React from "react";
import { ParallaxProvider, Parallax } from "react-scroll-parallax";
import { motion } from "framer-motion";

// Flip effect for the left images
const flipVariantsLeft = {
  hidden: { opacity: 0, rotateY: -90 },
  visible: { opacity: 1, rotateY: 0, transition: { duration: 0.8 } },
};

// Flip effect for the right images
const flipVariantsRight = {
  hidden: { opacity: 0, rotateY: 90 },
  visible: { opacity: 1, rotateY: 0, transition: { duration: 0.8 } },
};

// Flip effect for the middle image
const flipVariantsUp = {
  hidden: { opacity: 0, rotateX: 90 },
  visible: { opacity: 1, rotateX: 0, transition: { duration: 0.8 } },
};

// Hover effect functions
const handleMouseMove = (
  e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  element: HTMLDivElement
) => {
  const rect = element.getBoundingClientRect();
  const cardCenterX = rect.width / 2;
  const cardCenterY = rect.height / 2;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const xRotation = ((y - cardCenterY) / cardCenterY) * -40;
  const yRotation = ((x - cardCenterX) / cardCenterX) * 40;

  element.style.transition = "transform 0.5s ease"; // Quick hover effect
  element.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
};

const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
  const card = e.currentTarget;
  card.style.transition = "transform 3s ease"; // Slow unhover effect
  card.style.transform = "rotateX(0) rotateY(0)";
};

export default function HeroImages() {
  return (
    <ParallaxProvider>
    <div className="bg-transparent relative md:max-h-screen h-full flex items-start justify-center w-full mt-14 lg:mt-32">
      {/* Wrapper for the columns */}
      <div className="bg-transparent relative flex justify-start w-full mx-auto md:gap-7 overflow-clip">
        {/* First Column - Flip from the Left + Hover */}
        <motion.div
          className="bg-transparent hidden md:flex items-center w-[20vw] max-w-full"
          variants={flipVariantsLeft}
          initial="hidden"
          animate="visible"
          onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
          onMouseLeave={handleMouseLeave}
          style={{ transition: "transform 0.2s ease" }}
        >
          <Parallax speed={-15} easing="easeOutQuad" scale={[1, 1.05]}>
            <img
              src="/previews/hero-image-1.webp"
              alt="Left 1"
              className="bg-transparent w-full h-auto object-cover rounded-[30px]"
            />
          </Parallax>
        </motion.div>

        {/* Second Column - Flip from the Left + Hover */}
        <motion.div
          className="bg-transparent hidden md:flex items-center w-[20vw] max-w-full pt-32 -mr-6"
          variants={flipVariantsLeft}
          initial="hidden"
          animate="visible"
          onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
          onMouseLeave={handleMouseLeave}
          style={{ transition: "transform 0.2s ease" }}
        >
          <Parallax speed={-15} easing="easeOutQuad" scale={[1, 1.05]}>
            <img
              src="/previews/preview-1.webp"
              alt="Left 2"
              className="bg-transparent w-full h-auto object-cover shadow-lg rounded-[30px]"
            />
          </Parallax>
        </motion.div>

        {/* Middle Column - Only Flip Up on Load (No Hover) */}
        <div
          className="bg-transparent relative md:hidden flex items-center z-[9999] justify-center mx-auto px-5 md:px-10 w-full md:w-96 lg:w-[25vw] max-w-full"
          style={{ transition: "transform 0.2s ease" }}
        >
          <div className="bg-transparent animate-flip-up z-[9999] relative">
            <img
              src="/previews/primary.webp"
              alt="Primary"
              className="bg-transparent w-full h-auto object-cover"
            />
          </div>
        </div>

        <motion.div
          className="bg-transparent hidden relative md:flex z-[9999] items-start justify-center mx-auto px-5 w-full md:w-96 lg:w-[26vw] max-w-full"
          variants={flipVariantsUp}
          initial="hidden"
          animate="visible"
          style={{ transition: "transform 0.2s ease" }}
        >
          <div className="bg-transparent animate-flip-up z-[9999] relative">
            <img
              src="/previews/primary.webp"
              alt="Primary"
              className="bg-transparent w-full h-auto object-cover"
            />
          </div>
        </motion.div>

        {/* Fourth Column - Flip from the Right + Hover */}
        <motion.div
          className="bg-transparent hidden md:flex items-center w-[20vw] max-w-full pt-32 -ml-6"
          variants={flipVariantsRight}
          initial="hidden"
          animate="visible"
          onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
          onMouseLeave={handleMouseLeave}
          style={{ transition: "transform 0.2s ease" }}
        >
          <Parallax speed={-15} easing="easeOutQuad" scale={[1, 1.05]}>
            <img
              src="/previews/preview-2.webp"
              alt="Right 1"
              className="bg-transparent w-full h-auto object-cover shadow-lg rounded-[30px]"
            />
          </Parallax>
        </motion.div>

        <Parallax speed={-15} easing="easeOutQuad" scale={[1, 1.05]}>
          {/* Fifth Column - Flip from the Right + Hover */}
          <motion.div
            className="bg-transparent hidden md:flex flex-col justify-end gap-10 items-start w-[20vw] max-w-full pt-40"
            variants={flipVariantsRight}
            initial="hidden"
            animate="visible"
            onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
            onMouseLeave={handleMouseLeave}
            style={{ transition: "transform 0.2s ease" }}
          >
            <img
              src="/previews/hero-image-2.webp"
              alt="Right 2"
              className="bg-transparent w-full h-auto object-cover rounded-[30px]"
            />

            <img
              src="/previews/hero-image-3.webp"
              alt="Right 2"
              className="bg-transparent w-44 h-auto object-cover rounded-[30px] mt-32"
            />
          </motion.div>
        </Parallax>
      </div>
      <div className="bg-transparent blured-bg"></div>
    </div>
  </ParallaxProvider>

  );
}