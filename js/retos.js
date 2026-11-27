// RETOS de la escena (sin álbum: aquí no hay una colección natural). Lo común está en js/retos-comun.js.
const RETOS_ESCENA = crearRetos({
    clave: 'simulaciencia-modelos-retos',
    retos: [
        { id: 'nucleo',    txt: 'Acierta al núcleo: dispara «Una a una» y haz que una α vuelva hacia atrás.' },
        { id: 'casi',      txt: 'Casi de vuelta: consigue una α desviada más de 170°.' },
        { id: 'thomson',   txt: 'Thomson a prueba: lanza 500 α con el modelo de Thomson y comprueba que ninguna se desvía más de 5°.' },
        { id: 'ligero',    txt: 'Ligero y pesado: el mismo disparo que vuelve con oro no vuelve con hidrógeno (Z = 1).' },
        { id: 'velocidad', txt: 'A toda velocidad: a la misma altura, con más energía la α se desvía menos.' },
    ],
});
