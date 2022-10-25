/**
 * @description 두 점 사이의 거리를 반환합니다.
 */
export function getTwoPointDistance(mainPoint: { x: number; y: number }, targetPoint: { x: number; y: number }){
  return Math.sqrt(Math.pow((mainPoint.x - targetPoint.x), 2) + Math.pow((mainPoint.y - targetPoint.y), 2));
}
