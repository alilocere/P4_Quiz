const Sequelize = require('sequelize');
const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require('./out');



exports.helpCmd = rl => {
  		log(" Commandos: ");
  		log(" h|help - Muestra esta ayuda.");
  		log(" list - Listar los quizzes existentes. ");
  		log(" show <id> - Muestra la pregunta y la respuesta del quiz indicado. ");
  		log(" add - Añadir un nuevo quiz interactivamente. ");
  		log(" delete <id> - Borrar el quiz indicado. ");
  		log(" edit <id> - Editar el quiz indicado. ");
  		log(" test <id> - Probar el quiz indicado. ");
  		log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes. ");
  		log(" credits - Créditos. ");
  		log(" q|quit - Salir del programa. ");
 		rl.prompt();
  };

exports.quitCmd = rl => {
  rl.close();
  };
  
const makeQuestion = (rl, text) => {
  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });
};

exports.addCmd = rl => {
  makeQuestion(rl, ' Introduzca una pregunta: ')
  .then(q => {
    return makeQuestion(rl, ' Introduzca la respuesta')
    .then(a => {
      return {question: q, answer: a};
    });
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
  .then(quiz => {
    log(`${colorize(' Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog('El quiz es errorneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

exports.listCmd = rl => {
  models.quiz.findAll()
  .each(quiz => {
      log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
});

};

const validateId = id => {
  return new Promise((resolve, reject) => {
    if (typeof id === "undefined") {
      reject (new Error(`Falta el parámetro <id>.`));
    } else{
      id = parseInt(id);
      if (Number.isNaN(id)){
        reject (new Error(`El valor del parámetro <id> no es un número.`));
      }else{
        resolve(id);
      }
    }
  });
};

exports.showCmd = (rl, id) => {
  validateId(id)
  .then(id=> models.quiz.findById(id))
  .then(quiz => {
    if(!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }
    log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);

  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};
  


exports.testCmd = (rl, id) => {
  validateId(id)
      .then( id=> models.quiz.findById(id))
      .then( quiz => {
          if(!quiz) {
              throw new Error(`No existe un quiz asociado al id=${id}.`);
          }
          makeQuestion(rl,'¿' + quiz.question + '?')
              .then(a => {
                  if( (a.toLowerCase().trim())===(quiz.answer.toLowerCase().trim())){
                      log('Su respuesta es correcta.');
                      biglog('Correcta', 'green');
                  }
                  else{
                      log('Su respuesta es incorrecta.');
                      biglog('Incorrecta', 'red');
                  }
              })

      })
      .catch(error => {
          errorlog(error.message);
      })
      .then(() => {
          rl.prompt();
      });
};


exports.deleteCmd = (rl, id) => {
  
 validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};
  
	

exports.editCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
	  if(!quiz){
	    throw new Error(`No existe un quiz asociado al id=${id}.`);
	  }
	  process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, ' Introduzca una pregunta: ')
      .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
       return makeQuestion(rl, ' Introduzca la respuesta ')
      .then (a => {
        quiz.question =q;
        quiz.answer = a;
        return quiz;
      });
    });
	})
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz =>{
    log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog('El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};
          

exports.playCmd = rl => {
    let score = 0;
    let q;
    let toBe = [];

    models.quiz.findAll()
        .each(quiz => {
          toBe.push(quiz);
        })
        .then(() => {
            if (toBe.length === 0) {
            log('No hay nada más que preguntar.');
            log(`Fin del juego. Aciertos: ${score}`);
            biglog(score, 'magenta');
            rl.prompt();
            }else{
              playOne();
            }
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });

    const playOne = () => {

        if (toBe.length === 0) {
            log('No hay nada más que preguntar.');
            log(`Fin del juego. Aciertos: ${score}`);
            biglog(score, 'magenta');
            return;
        }
        let id = Math.floor(Math.random() * (toBe.length));
        q = toBe.splice(id, 1);
        if (!q) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        makeQuestion(rl, '¿' + q[0].question + '?')
            .then(a => {
                if ((a.toLowerCase().trim()) === (q[0].answer.toLowerCase().trim())) {
                    score++;
                    log(`CORRECTO - Lleva ${score} aciertos`);
                    playOne();
                }
                else {
                    log('INCORRECTO.');
                    log(`Fin del juego. Aciertos: ${score}`);
                    biglog(score, 'magenta');
                }
            })

    };

};
	
    

exports.creditsCmd = rl => {
	log('Autores de la practica:');
  	log('ALICIA', 'green');
  	 rl.prompt();
};

