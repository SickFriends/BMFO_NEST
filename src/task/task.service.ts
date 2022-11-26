import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry, Timeout } from '@nestjs/schedule';
import { CronJob, job } from 'cron';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(private schedulerRegistry: SchedulerRegistry) {}
  addNewTimeout(timeoutName: string, milliseconds: number, callBack: any) {
    const timeout = setTimeout(callBack, milliseconds);
    this.schedulerRegistry.addTimeout(timeoutName, timeout);
    this.logger.log(`${timeoutName} is excuted`);
  }
  addNewSchedule(name: string, time: Date, callback: any) {
    const job = new CronJob(time, callback);
    this.schedulerRegistry.addCronJob(name, job);
  }
}
