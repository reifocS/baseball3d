"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box, Sphere, Text, Html, Environment } from "@react-three/drei";
import * as THREE from "three";

const Ball = ({
  setScore,
  setGameState,
  batRef,
  incrementBallCount,
  velocityMultiplier,
}) => {
  const ballRef = useRef();
  const initialPosition = new THREE.Vector3(0, 1.5, -10);
  const [ballPosition, setBallPosition] = useState(initialPosition);
  const initialVelocity = new THREE.Vector3(0, 0, 10).multiplyScalar(
    velocityMultiplier
  );
  const [ballVelocity, setBallVelocity] = useState(initialVelocity);

  useFrame((state, delta) => {
    if (ballPosition.z > 10 || ballPosition.z < -10) {
      setBallPosition(initialPosition.clone());
      setBallVelocity(
        new THREE.Vector3(0, 0, 10).multiplyScalar(velocityMultiplier)
      );
      incrementBallCount();
      return;
    }

    const newPosition = ballPosition
      .clone()
      .add(ballVelocity.clone().multiplyScalar(delta));
    setBallPosition(newPosition);

    if (ballRef.current) {
      ballRef.current.position.copy(newPosition);
    }

    // Check for collision with bat
    if (batRef.current && batRef.current.userData.isSwinging) {
      const batPosition = new THREE.Vector3();
      batRef.current.getWorldPosition(batPosition);
      const batTipPosition = batPosition
        .clone()
        .add(new THREE.Vector3(0, 0.5, 0));
      const distance = newPosition.distanceTo(batTipPosition);

      if (distance < 0.3) {
        setScore((prev) => prev + 1);
        // Calculate bounce direction
        const hitDirection = new THREE.Vector3()
          .subVectors(newPosition, batTipPosition)
          .normalize();
        // Add some upward direction to the bounce
        hitDirection.y += 1;
        hitDirection.normalize();
        // Set new velocity (bouncing back)
        setBallVelocity(hitDirection.multiplyScalar(15));
        batRef.current.userData.isSwinging = false;
      }
    }
  });

  return (
    <Sphere
      ref={ballRef}
      args={[0.1, 32, 32]}
      position={ballPosition.toArray()}
    >
      <meshStandardMaterial color={"white"} />
    </Sphere>
  );
};

const BaseballBat = ({ isSwinging, batRef }) => {
  const [swingPhase, setSwingPhase] = useState(0);
  const swingDuration = 0.3; // seconds
  const windUpRotation = new THREE.Euler(0, -Math.PI / 4, -Math.PI / 4);
  const followThroughRotation = new THREE.Euler(
    -Math.PI / 4,
    Math.PI / 4,
    Math.PI / 4
  );

  useFrame((state, delta) => {
    if (isSwinging) {
      setSwingPhase((prev) => Math.min(prev + delta / swingDuration, 1));
    } else {
      setSwingPhase(0);
    }

    const t = swingPhase;
    const x = THREE.MathUtils.lerp(
      windUpRotation.x,
      followThroughRotation.x,
      t
    );
    const y = THREE.MathUtils.lerp(
      windUpRotation.y,
      followThroughRotation.y,
      t
    );
    const z = THREE.MathUtils.lerp(
      windUpRotation.z,
      followThroughRotation.z,
      t
    );

    batRef.current.rotation.set(x, y, z);
    batRef.current.userData.isSwinging = isSwinging;
  });

  return (
    <group ref={batRef} position={[0, 1.2, 7]}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 1, 32]} />
        <meshStandardMaterial color="brown" />
      </mesh>
    </group>
  );
};

const Game = () => {
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState("ready");
  const [isSwinging, setIsSwinging] = useState(false);
  const [ballCount, setBallCount] = useState(0);
  const { camera } = useThree();
  const batRef = useRef();
  const [velocityMultiplier, setVelocityMultiplier] = useState(1);

  useEffect(() => {
    camera.position.set(0, 1.6, 7.5);
    camera.lookAt(0, 1.5, 0);
  }, [camera]);

  const startGame = () => {
    setGameState("playing");
    setBallCount(0);
    setScore(0);
    setVelocityMultiplier(1); // Reset velocity multiplier
  };

  const handleSwing = () => {
    if (gameState === "playing" && !isSwinging) {
      setIsSwinging(true);
      setTimeout(() => setIsSwinging(false), 300);
    }
  };

  const incrementBallCount = () => {
    setBallCount((prev) => {
      if (prev + 1 >= 10) {
        setGameState("ended");
      }
      return prev + 1;
    });
    setVelocityMultiplier((prev) => prev + 0.5); // Increase velocity multiplier
  };

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      <Box args={[20, 0.1, 20]} position={[0, -1, 0]}>
        <meshStandardMaterial color="green" />
      </Box>

      <BaseballBat isSwinging={isSwinging} batRef={batRef} />

      {gameState === "ready" && (
        <Html center>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Baseball Reflex Test</h2>
            <p className="mb-4">
              Click to swing when the ball is close to the bat!
            </p>
            <p className="mb-4">You have 10 balls to hit. Good luck!</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        </Html>
      )}

      {gameState === "playing" && (
        <Ball
          setScore={setScore}
          setGameState={setGameState}
          batRef={batRef}
          incrementBallCount={incrementBallCount}
          velocityMultiplier={velocityMultiplier} // Pass the multiplier to Ball component
        />
      )}

      {gameState === "ended" && (
        <Html center>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="mb-4">Your final score: {score} / 10</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={startGame}
            >
              Play Again
            </button>
          </div>
        </Html>
      )}

      <Text
        position={[0, 3, 0]}
        color="black"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        Score: {score} | Balls: {ballCount} / 10
      </Text>

      {/* Invisible plane for click detection */}
      <mesh position={[0, 0, 0]} onClick={handleSwing}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

export default function Component() {
  return (
    <div className="w-full h-screen">
      <Canvas shadows>
        <Game />
      </Canvas>
    </div>
  );
}
