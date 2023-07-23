type Producer<A> = () => Promise<A>;
type Fn<A> = (x: A) => void;

export class PromiseQ {
  private running = 0;
  private readonly queue = new Array<[Producer<any>, Fn<any>, Fn<Error>]>();

  constructor(private readonly n: number) {}

  public do<A>(block: Producer<A>): Promise<A> {
    return new Promise<A>((ok, ko) => {
      this.queue.push([block, ok, ko]);
      this.trySchedule();
    });
  }

  private trySchedule() {
    if (this.queue.length == 0 || this.running >= this.n) {
      return;
    }

    const [block, ok, ko] = this.queue.shift()!;
    this.running += 1;
    try {
      block()
        .then(ok)
        .catch(ko)
        .finally(() => {
          this.running -= 1;
          this.trySchedule();
        });
    } catch (e: any) {
      // Might be an error in the synchronous part of 'block'
      ko(e);
      this.running -= 1;
      this.trySchedule();
    }
  }
}