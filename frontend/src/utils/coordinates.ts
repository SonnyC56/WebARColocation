import { Vector3, Quaternion, Matrix } from '@babylonjs/core';

/**
 * Coordinate transformation utilities for QR anchor-based coordinate system
 */

// Standard marker orientation: QR code facing = +Z axis
export const MARKER_FORWARD = Vector3.Forward();
export const MARKER_UP = Vector3.Up();
export const MARKER_RIGHT = Vector3.Right();

/**
 * Convert position from anchor-relative coordinates to world coordinates
 */
export function anchorToWorld(
  anchorPosition: Vector3,
  anchorRotation: Quaternion,
  localPosition: Vector3
): Vector3 {
  const matrix = Matrix.Compose(
    Vector3.One(), // scale
    anchorRotation,
    anchorPosition
  );
  
  return Vector3.TransformCoordinates(localPosition, matrix);
}

/**
 * Convert position from world coordinates to anchor-relative coordinates
 */
export function worldToAnchor(
  anchorPosition: Vector3,
  anchorRotation: Quaternion,
  worldPosition: Vector3
): Vector3 {
  const matrix = Matrix.Compose(
    Vector3.One(),
    anchorRotation,
    anchorPosition
  );
  
  const inverseMatrix = matrix.clone();
  inverseMatrix.invert();
  
  return Vector3.TransformCoordinates(worldPosition, inverseMatrix);
}

/**
 * Convert rotation from anchor-relative to world space
 */
export function anchorRotationToWorld(
  anchorRotation: Quaternion,
  localRotation: Quaternion
): Quaternion {
  return anchorRotation.multiply(localRotation);
}

/**
 * Convert rotation from world space to anchor-relative
 */
export function worldRotationToAnchor(
  anchorRotation: Quaternion,
  worldRotation: Quaternion
): Quaternion {
  const inverseAnchor = anchorRotation.clone();
  inverseAnchor.conjugate();
  return inverseAnchor.multiply(worldRotation);
}

/**
 * Create a transform matrix from position and rotation
 */
export function createTransformMatrix(
  position: Vector3,
  rotation: Quaternion
): Matrix {
  return Matrix.Compose(Vector3.One(), rotation, position);
}

/**
 * Extract position and rotation from a transform matrix
 */
export function extractTransform(matrix: Matrix): {
  position: Vector3;
  rotation: Quaternion;
} {
  const position = matrix.getTranslation();
  const rotation = Quaternion.FromRotationMatrix(matrix.getRotationMatrix());
  
  return { position, rotation };
}

/**
 * Calculate distance between two positions
 */
export function distance(pos1: Vector3, pos2: Vector3): number {
  return Vector3.Distance(pos1, pos2);
}

/**
 * Check if two positions are approximately equal (within tolerance)
 */
export function positionsEqual(
  pos1: Vector3,
  pos2: Vector3,
  tolerance: number = 0.01
): boolean {
  return distance(pos1, pos2) < tolerance;
}
