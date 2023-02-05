import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgModule, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonContent, IonicModule, IonRouterOutlet } from '@ionic/angular';
import { BehaviorSubject, combineLatest, filter, map, switchMap, tap } from 'rxjs';
import { ChecklistService } from '../shared/data-access/checklist.service';
import { Checklist } from '../shared/interfaces/checklist';
import { ChecklistItem } from '../shared/interfaces/checklist-item';
import { FormModalComponentModule } from "../shared/ui/form-modal.component";
import { ChecklistItemService } from './data-access/checklistItemService';
import { ChecklistItemHeaderModule } from './ui/checklist-item-header.component';
import { ChecklistItemListComponentModule } from "./ui/checklist-item-list.component";
@Component({
  selector: 'app-checklist',
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <app-checklist-item-header
        [checklist]="vm.checklist"
        (addItem)="formModalIsOpen$.next(true)"
        (resetChecklist)="resetChecklistItems($event)"
      ></app-checklist-item-header>
      <ion-content>
        <app-checklist-item-list
          [checklistItems]="vm.items"
          (toggle)="toggleChecklistItem($event)"
          (delete)="deleteChecklistItem($event)"
          (edit)="openEditModal($event)"
        ></app-checklist-item-list>
        <ion-modal
          [isOpen]="vm.formModalIsOpen"
          [presentingElement]="routerOutlet.nativeEl"
          [canDismiss]="true"
          (ionModalDidDismiss)="
            checklistItemIdBeingEdited$.next(null); formModalIsOpen$.next(false)
          "
        >
          <ng-template>
            <app-form-modal
              [title]="
                vm.checklistItemIdBeingEdited ? 'Edit item' : 'Create item'
              "
              [formGroup]="checklistItemForm"
              (save)="
                vm.checklistItemIdBeingEdited
                  ? editChecklistItem(vm.checklistItemIdBeingEdited)
                  : addChecklistItem(vm.checklist.id)
              "
            ></app-form-modal>
          </ng-template>
        </ion-modal>
      </ion-content>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [` ion-header {
    background-color: var(--ion-color-primary);
  }`]
})
export class ChecklistComponent {
  @ViewChild(IonContent) ionContent!: IonContent;


  checklistAndItems$ = this.route.paramMap.pipe(
    switchMap((params) =>
      combineLatest([
        this.checklistService
          .getChecklistById(params.get('id') as string)
          .pipe(filter((checklist): checklist is Checklist => !!checklist)),
        this.checklistItemService
          .getItemsByChecklistId(params.get('id') as string)
          .pipe(
            tap(() => setTimeout(() => this.ionContent.scrollToBottom(200), 0))
          ),
      ])
    )
  );

  checklistItemIdBeingEdited$ = new BehaviorSubject<string | null>(null);

  formModalIsOpen$ = new BehaviorSubject<boolean>(false);

  vm$ = combineLatest([
    this.checklistAndItems$,
    this.formModalIsOpen$,
    this.checklistItemIdBeingEdited$,
  ]).pipe(
    map(
      ([[checklist, items], formModalIsOpen, checklistItemIdBeingEdited]) => ({
        checklist,
        items,
        formModalIsOpen,
        checklistItemIdBeingEdited,
      })
    )
  );

  checklistItemForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
  });

  constructor(
    private route: ActivatedRoute,
    private checklistService: ChecklistService,
    private fb: FormBuilder,
    private checklistItemService: ChecklistItemService,
    public routerOutlet: IonRouterOutlet
  ) {}

  addChecklistItem(checklistId: string) {
    this.checklistItemService.add(
      this.checklistItemForm.getRawValue(),
      checklistId
    )
  }

  editChecklistItem(checklistItemId: string) {
    this.checklistItemService.update(
      checklistItemId,
      this.checklistItemForm.getRawValue()
    );
  }

  openEditModal(checklistItem: ChecklistItem) {
    this.checklistItemForm.patchValue({
      title: checklistItem.title,
    });
    this.checklistItemIdBeingEdited$.next(checklistItem.id);
    this.formModalIsOpen$.next(true);
  }

  deleteChecklistItem(id: string) {
    this.checklistItemService.remove(id);
  }

  toggleChecklistItem(itemId: string) {
    this.checklistItemService.toggle(itemId);
  }

  resetChecklistItems(checklistId: string) {
    this.checklistItemService.reset(checklistId);
  }
}
@NgModule({
    declarations: [ChecklistComponent],
    imports: [
        CommonModule,
        IonicModule,
        ChecklistItemHeaderModule,
        RouterModule.forChild([
            {
                path: '',
                component: ChecklistComponent,
            },
        ]),
        FormModalComponentModule,
        ChecklistItemListComponentModule
    ]
})
export class ChecklistComponentModule {}
