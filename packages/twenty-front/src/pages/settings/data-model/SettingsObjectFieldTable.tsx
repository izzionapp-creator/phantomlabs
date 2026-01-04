import { useUpdateOneFieldMetadataItem } from '@/object-metadata/hooks/useUpdateOneFieldMetadataItem';
import { type ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import {
  SettingsObjectFieldItemTableRow,
  StyledObjectFieldTableRow,
} from '@/settings/data-model/object-details/components/SettingsObjectFieldItemTableRow';
import { settingsObjectFieldsFamilyState } from '@/settings/data-model/object-details/states/settingsObjectFieldsFamilyState';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { SortableTableHeader } from '@/ui/layout/table/components/SortableTableHeader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { useSortedArray } from '@/ui/layout/table/hooks/useSortedArray';
import { type TableMetadata } from '@/ui/layout/table/types/TableMetadata';
import styled from '@emotion/styled';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { IconArchive, IconFilter, IconSearch } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { MenuItemToggle } from 'twenty-ui/navigation';
import { useMapFieldMetadataItemToSettingsObjectDetailTableItem } from '~/pages/settings/data-model/hooks/useMapFieldMetadataItemToSettingsObjectDetailTableItem';
import { type SettingsObjectDetailTableItem } from '~/pages/settings/data-model/types/SettingsObjectDetailTableItem';
import { moveArrayItem } from '~/utils/array/moveArrayItem';
import { normalizeSearchText } from '~/utils/normalizeSearchText';


const GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_STANDARD: TableMetadata<SettingsObjectDetailTableItem> =
  {
    tableId: 'settingsObjectDetail',
    fields: [
      {
        fieldLabel: msg`Name`,
        fieldName: 'label',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Field type`,
        fieldName: 'fieldType',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Data type`,
        fieldName: 'dataType',
        fieldType: 'string',
        align: 'left',
      },
    ],
    initialSort: {
      fieldName: 'position',
      orderBy: 'AscNullsLast',
    },
  };

const GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_CUSTOM: TableMetadata<SettingsObjectDetailTableItem> =
  {
    tableId: 'settingsObjectDetail',
    fields: [
      {
        fieldLabel: msg`Name`,
        fieldName: 'label',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Identifier`,
        fieldName: 'identifierType',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Data type`,
        fieldName: 'dataType',
        fieldType: 'string',
        align: 'left',
      },
    ],
    initialSort: {
      fieldName: 'position',
      orderBy: 'AscNullsLast',
    },
  };

const StyledSearchAndFilterContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-bottom: ${({ theme }) => theme.spacing(2)};
  width: 100%;
`;

const StyledSearchInput = styled(SettingsTextInput)`
  flex: 1;
`;

export type SettingsObjectFieldTableProps = {
  objectMetadataItem: ObjectMetadataItem;
  mode: 'view' | 'new-field';
};

// TODO: find another way than using mode which feels like it could be replaced by another pattern
export const SettingsObjectFieldTable = ({
  objectMetadataItem,
  mode,
}: SettingsObjectFieldTableProps) => {
  const { t } = useLingui();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  const tableMetadata = objectMetadataItem.isCustom
    ? GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_CUSTOM
    : GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_STANDARD;

  const { mapFieldMetadataItemToSettingsObjectDetailTableItem } =
    useMapFieldMetadataItemToSettingsObjectDetailTableItem(objectMetadataItem);

  const [settingsObjectFields, setSettingsObjectFields] = useRecoilState(
    settingsObjectFieldsFamilyState({
      objectMetadataItemId: objectMetadataItem.id,
    }),
  );

  const { updateOneFieldMetadataItem } = useUpdateOneFieldMetadataItem();

  useEffect(() => {
    setSettingsObjectFields(objectMetadataItem.fields);
  }, [objectMetadataItem, setSettingsObjectFields]);

  const allObjectSettingsDetailItems = useMemo(() => {
    const nonSystemFields = settingsObjectFields?.filter(
      (fieldMetadataItem) => !fieldMetadataItem.isSystem,
    );

    return (
      nonSystemFields?.map(
        mapFieldMetadataItemToSettingsObjectDetailTableItem,
      ) ?? []
    );
  }, [
    settingsObjectFields,
    mapFieldMetadataItemToSettingsObjectDetailTableItem,
  ]);

  const sortedAllObjectSettingsDetailItems = useSortedArray(
    allObjectSettingsDetailItems,
    tableMetadata,
  );

  const filteredItems = useMemo(() => {
    const searchNormalized = normalizeSearchText(searchTerm);

    return sortedAllObjectSettingsDetailItems.filter((item) => {
      const matchesActiveFilter =
        showInactive || item.fieldMetadataItem.isActive;

      const matchesSearch =
        normalizeSearchText(item.label).includes(searchNormalized) ||
        normalizeSearchText(item.dataType).includes(searchNormalized);

      return matchesActiveFilter && matchesSearch;
    });
  }, [sortedAllObjectSettingsDetailItems, searchTerm, showInactive]);

  // Get fields sorted by position (without filtering or other sorting)
  const fieldsSortedByPosition = useMemo(() => {
    if (!settingsObjectFields) return [];

    const nonSystemFields = settingsObjectFields.filter(
      (field) => !field.isSystem,
    );

    return [...nonSystemFields].sort((a, b) => {
      const positionA = a.settings?.position ?? 0;
      const positionB = b.settings?.position ?? 0;
      return positionA - positionB;
    });
  }, [settingsObjectFields]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      // Work with the filtered items to get the correct field IDs
      const movedItem = filteredItems[sourceIndex];
      if (!movedItem) {
        return;
      }

      // Find the actual indices in the sorted-by-position array
      const sourceIndexInSorted = fieldsSortedByPosition.findIndex(
        (field) => field.id === movedItem.fieldMetadataItem.id,
      );

      if (sourceIndexInSorted === -1) {
        return;
      }

      // Calculate destination index in sorted array
      // We need to map from filteredItems indices to fieldsSortedByPosition indices
      const destinationItem = filteredItems[destinationIndex];
      if (!destinationItem) {
        return;
      }

      const destinationIndexInSorted = fieldsSortedByPosition.findIndex(
        (field) => field.id === destinationItem.fieldMetadataItem.id,
      );

      if (destinationIndexInSorted === -1) {
        return;
      }

      // Reorder the fields using moveArrayItem
      const reorderedFields = moveArrayItem(fieldsSortedByPosition, {
        fromIndex: sourceIndexInSorted,
        toIndex: destinationIndexInSorted,
      });

      // Update positions: assign sequential positions based on new order
      const fieldsWithNewPositions = reorderedFields.map((field, index) => ({
        ...field,
        settings: {
          ...field.settings,
          position: index * 1000,
        },
      }));

      // Optimistic update
      setSettingsObjectFields(fieldsWithNewPositions);

      // Update all fields with new positions
      const updatePromises = fieldsWithNewPositions.map((field) =>
        updateOneFieldMetadataItem({
          objectMetadataId: objectMetadataItem.id,
          fieldMetadataIdToUpdate: field.id,
          updatePayload: {
            settings: {
              ...field.settings,
            },
          },
        }),
      );

      // Wait for all updates to complete
      await Promise.all(updatePromises);
    },
    [
      filteredItems,
      fieldsSortedByPosition,
      objectMetadataItem.id,
      updateOneFieldMetadataItem,
      setSettingsObjectFields,
    ],
  );

  return (
    <>
      <StyledSearchAndFilterContainer>
        <StyledSearchInput
          instanceId="object-field-table-search"
          LeftIcon={IconSearch}
          placeholder={t`Search a field...`}
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Dropdown
          dropdownId="settings-fields-filter-dropdown"
          dropdownPlacement="bottom-end"
          dropdownOffset={{ x: 0, y: 8 }}
          clickableComponent={
            <Button
              Icon={IconFilter}
              size="medium"
              variant="secondary"
              accent="default"
              ariaLabel={t`Filter`}
            />
          }
          dropdownComponents={
            <DropdownContent>
              <DropdownMenuItemsContainer>
                <MenuItemToggle
                  LeftIcon={IconArchive}
                  onToggleChange={() => setShowInactive(!showInactive)}
                  toggled={showInactive}
                  text={t`Inactive`}
                  toggleSize="small"
                />
              </DropdownMenuItemsContainer>
            </DropdownContent>
          }
        />
      </StyledSearchAndFilterContainer>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Table>
          <StyledObjectFieldTableRow>
            {tableMetadata.fields.map((item) => (
              <SortableTableHeader
                key={item.fieldName}
                fieldName={item.fieldName}
                label={t(item.fieldLabel)}
                tableId={tableMetadata.tableId}
                initialSort={tableMetadata.initialSort}
              />
            ))}
            <TableHeader></TableHeader>
          </StyledObjectFieldTableRow>
          <Droppable droppableId="object-fields-list">
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
              >
                {filteredItems.map((objectSettingsDetailItem, index) => {
                  const status = objectSettingsDetailItem.fieldMetadataItem.isActive
                    ? 'active'
                    : 'disabled';

                  return (
                    <Draggable
                      key={objectSettingsDetailItem.fieldMetadataItem.id}
                      draggableId={objectSettingsDetailItem.fieldMetadataItem.id}
                      index={index}
                      isDragDisabled={!!searchTerm}
                    >
                      {(draggableProvided, draggableSnapshot) => (
                        <SettingsObjectFieldItemTableRow
                          key={objectSettingsDetailItem.fieldMetadataItem.id}
                          settingsObjectDetailTableItem={objectSettingsDetailItem}
                          status={status}
                          mode={mode}
                          draggableProvided={draggableProvided}
                          draggableSnapshot={draggableSnapshot}
                        />
                      )}
                    </Draggable>
                  );
                })}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </>
  );
};
