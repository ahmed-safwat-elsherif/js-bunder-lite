export default class Person {
  name;
  age;
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  sayHi() {
    const message = `Hi, my name is ${this.name}`;
    console.log(message);
    return message;
  }
}
