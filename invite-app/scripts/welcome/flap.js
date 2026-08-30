let flapTurnFrame = null;


/* =========================================================
   MONITORAMENTO DA ABA SUPERIOR
========================================================= */

export function watchFlapTurn(welcome, flap) {

  const flapStyle =
    window.getComputedStyle(flap);

  const transformValues =
    flapStyle.transform
      .replace('matrix3d(', '')
      .replace(')', '')
      .split(',')
      .map(Number);

  if (transformValues.length === 16) {

    const angle =
      Math.atan2(
        transformValues[6],
        transformValues[5]
      ) * 180 / Math.PI;

    const normalizedAngle =
      angle < 0
        ? angle + 360
        : angle;

    /*
     * A aba é considerada virada quando a rotação
     * entra na faixa monitorada abaixo.
     */
    if (
      normalizedAngle >= 90 &&
      normalizedAngle <= 295
    ) {

      welcome.classList.add(
        'is-flap-turned'
      );

      return;
    }
  }

  flapTurnFrame =
    window.requestAnimationFrame(
      () => watchFlapTurn(welcome, flap)
    );
}


export function startFlapWatch(welcome, flap) {

  flapTurnFrame =
    window.requestAnimationFrame(
      () => watchFlapTurn(welcome, flap)
    );
}


export function stopFlapWatch() {

  window.cancelAnimationFrame(
    flapTurnFrame
  );

  flapTurnFrame = null;
}
