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
  deleteTimeout(timeoutName: string) {
    this.schedulerRegistry.deleteTimeout(timeoutName);
  }
}
