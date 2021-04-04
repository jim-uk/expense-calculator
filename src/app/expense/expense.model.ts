export class Expense{
  constructor (
    public id: string,
    public title: string,
    public userId: string,
    public value: number,
    public imageUrl: string,
    public dtg: Date
  ){};
}
