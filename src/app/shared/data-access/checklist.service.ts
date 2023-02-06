import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, shareReplay, take, tap } from 'rxjs';
import { ChecklistItemService } from 'src/app/checklist/data-access/checklistItemService';
import { Checklist } from '../interfaces/checklist';
import { StorageService } from './storage.service';
@Injectable({
  providedIn: 'root',
})
export class ChecklistService {
  private checklists$ = new BehaviorSubject<Checklist[]>([]);

  constructor(
    private storageService: StorageService,
    private checklistItemService: ChecklistItemService) {}

  load() {
    this.storageService.loadChecklists$
      .pipe(take(1))
      .subscribe((checklists) => {
        this.checklists$.next(checklists);
      });
  }

  add(checklist: Pick<Checklist, 'title'>) {
    const newChecklist = {
      ...checklist,
      id: this.generateSlug(checklist.title),
    };
    this.checklists$.next([...this.checklists$.value, newChecklist]);
  }

  getChecklistById(id: string) {
    return this.getChecklists().pipe(
      filter((checklists) => checklists.length > 0),
      map((checklists) => checklists.find((checklist) => checklist.id === id))
    )
  }

  remove(id: string) {
    const modifiedChecklists = this.checklists$.value.filter(
      (checklist) => checklist.id !== id
    );
    this.checklistItemService.removeAllItemsForChecklist(id);
    this.checklists$.next(modifiedChecklists);
  }

  update(id: string, editedData: Checklist) {
    const modifiedChecklists = this.checklists$.value.map((checklist) =>
      checklist.id === id
        ? { ...checklist, title: editedData.title }
        : checklist
    );
    this.checklists$.next(modifiedChecklists);
  }

   // This is what we will use to consume the checklist data throughout the app
   private sharedChecklists$: Observable<Checklist[]> = this.checklists$.pipe(
     // Trigger a save whenever this stream emits new data
     tap((checklists) => this.storageService.saveChecklists(checklists)),
     // Share this stream with multiple subscribers, instead of creating a new one for each
     shareReplay(1)
   );
   // ...snip
   getChecklists() {
     return this.sharedChecklists$;
   }

  private generateSlug(title: string) {
    // NOTE: This is a simplistic slug generator and will not handle things like special characters.
    let slug = title.toLowerCase().replace(/\s+/g, '-');
    // Check if the slug already exists
    const matchingSlugs = this.checklists$.value.find(
      (checklist) => checklist.id === slug
    );
    // If the title is already being used, add a string to make the slug unique
    if (matchingSlugs) {
      slug = slug + Date.now().toString();
    }
    return slug;
  }

}
