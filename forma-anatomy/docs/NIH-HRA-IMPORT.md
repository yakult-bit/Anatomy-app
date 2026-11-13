# NIH 3D female reproductive reference organs — import report

Checked 7 September 2026.

## Audit before replacement

[v12 complete per-structure audit](female-audit/V12-FEMALE-AUDIT.md), [machine-readable inventory](female-audit/v12-inventory.json). The retired view contained 264 meshes and 11 groups imported from Anatria3D's pinned HRA female subset, with a CC BY 4.0 upstream notice. Forma's importer used no male geometry and performed no sex-shape deformation. It did uniformly scale and centre those female inputs. Individual NIH licences were not checked in v12: this was an attribution gap. All old active female system files and content have now been replaced by the seven directly sourced official NIH downloads below. Historical identifiers remain in the database for saved-data export; retired entries are unavailable for new questions.

## Scope and sources

Available: Uterus and cervix; Left and right ovaries; Left and right uterine tubes; Urinary bladder; Sacrum, coccyx and pelvic bones.

Not included: Vagina; Complete urethra; External genitalia; Pelvic floor muscles; Whole-body skin, muscles, head and limbs. These are dataset gaps, not anatomical absences. No independently licensed NIH HRA vagina or complete urethra was located in the reviewed records; the bladder file contains neck tissue and ureteral openings, not a complete urethra. No substitute geometry was fabricated.

Each page explicitly identifies the Visible Human Female sub-collection. Every downloaded mesh declares the original source spatial entity #VHFemaleOrgans. Their native world transforms and shared metre coordinates are preserved before applying one common uniform 10× unit conversion and translation [0.086, -0.59, 0.911]. No individual organ rescaling, translation to fit a male donor, vertex deformation, hole filling or speculative shape repair is performed. The original male system GLBs are unchanged.

| Official model | NIH ID / page version | Individually checked licence | Original GLB bytes | Draco GLB bytes |
|---|---|---|---:|---:|
| [Uterus, Female](https://3d.nih.gov/entries/3DPX-020996) | 3DPX-020996 v1.02 | CC-BY-4.0 | 909,772 | 129,224 |
| [Ovary, Female, Left](https://3d.nih.gov/entries/3DPX-020979) | 3DPX-020979 v1.01 | CC-BY-4.0 | 8,984 | 3,536 |
| [Ovary, Female, Right](https://3d.nih.gov/entries/3DPX-020980) | 3DPX-020980 v1.01 | CC-BY-4.0 | 8,744 | 3,472 |
| [Urinary Bladder, Female](https://3d.nih.gov/entries/3DPX-020995) | 3DPX-020995 v1.01 | CC-BY-4.0 | 765,100 | 114,284 |
| [Pelvis, Female](https://3d.nih.gov/entries/3DPX-020984) | 3DPX-020984 v1.01 | CC-BY-4.0 | 1,593,336 | 328,416 |
| [Fallopian Tube, Female, Left](https://3d.nih.gov/entries/3DPX-020964) | 3DPX-020964 v1.01 | CC-BY-4.0 | 336,676 | 67,696 |
| [Fallopian Tube, Female, Right](https://3d.nih.gov/entries/3DPX-020965) | 3DPX-020965 v1.01 | CC-BY-4.0 | 327,448 | 65,004 |

Original total: **3,950,060 bytes**. Seven individually downloadable adaptations: **711,632 bytes**. Each record includes creator attribution exactly as supplied on the page, page digest, source download endpoint, source/output SHA-256 and disclosed adaptations in public/credits/nih-hra-models.json. All seven pages show CC-BY and link to https://creativecommons.org/licenses/by/4.0/. This finding is per entry; future entries must be checked separately. No model with an unclear licence was imported.

### Uterus, Female — 3DPX-020996

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Uterus v1.1. https://doi.org/10.48539/HBM228.JBNJ.299. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020996

### Ovary, Female, Left — 3DPX-020979

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Ovary, Female, Left v1.1. https://doi.org/10.48539/HBM499.JLMB.357. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020979

### Ovary, Female, Right — 3DPX-020980

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Ovary, Female, Right v1.1. https://doi.org/10.48539/HBM453.QTZX.449. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020980

### Urinary Bladder, Female — 3DPX-020995

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Urinary Bladder, Female v1.1. https://doi.org/10.48539/HBM235.KQNP.897. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020995

### Pelvis, Female — 3DPX-020984

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Pelvis, Female v1.2. https://doi.org/10.48539/HBM427.CCRP.887. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020984

### Fallopian Tube, Female, Left — 3DPX-020964

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Fallopian Tube, Female, Left v1.1. https://doi.org/10.48539/HBM887.HZKB.637. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020964

### Fallopian Tube, Female, Right — 3DPX-020965

Kristen Browne; Heidi Schlehlein. 2022. 3D Reference Organ for Fallopian Tube, Female, Right v1.1. https://doi.org/10.48539/HBM875.FCDP.878. Accessed on May 6, 2022.

Source: https://3d.nih.gov/entries/3DPX-020965

## Load weight and runtime

The scene lazy-loads three system bundles: reproductive 266304 bytes, urinary 114136 bytes, skeletal 328292 bytes; total **708,732 bytes**. The separate recognition-context asset adds **222,664 bytes** when needed. The seven per-model downloads duplicate the geometry only as optional attribution/download assets; they are not loaded by the app. None of these female GLBs is requested for the default male view. The edited content/provenance JSON is part of the application bundle. Actual browser transfer and device memory were not measured. The final build artifact measurements are retained in docs/NIH-HRA-BUNDLE-MEASUREMENTS.json: JavaScript 13,019,772 bytes (1,935,884 gzip), CSS 198,445 bytes (34,986 gzip), and estimated female-view cold transfer 2,884,643 bytes including the application and decoder. This existing large JavaScript bundle remains a separate performance limitation; these estimates are not browser network traces.

The former runtime female system set was 6,243,484 bytes plus 3,181,496 bytes of recognition context (the replaced v13 build; v12 source metadata/audit retained). Framing and projected-footprint checks remain build-time JSON lookups. The CPU regression completed ten questions in each of four formats (40 questions) and measured a worst warm setup plus scheduled approach/frame allowance of under 160 ms, within the 300 ms regression budget. This is not a browser interactive measurement or cold download timing.

## Mesh quality and fair click targets

Decoded Draco triangles; positional weld tolerance 1e-6 scene units for topology counts only; up to 96 triangles per primitive sampled on each side; real accelerated Three.js raycasting, no proxy geometry. Gate assessed at aspect 1, with per-aspect recognition reports separately shipped.

40 meshes; 202,807 decoded triangles. 28 meshes have boundary edges; 0 have detected non-manifold edges. 8180/8180 sampled rays hit the real rendered surfaces. Boundary openings remain; this does not establish watertightness or guarantee hits through empty holes. Double-sided materials prevent backface winding from making a visible surface unpickable; no invisible solid proxy intercepts clicks.

| Original mesh | Open edges | Non-manifold edges | Ray hits / samples | Beginner Find | Advanced Find |
|---|---:|---:|---:|---|---|
| VH_F_abdominal_ostium_of_uterine_tube | 80 | 0 | 220/220 | annotation_under_review | annotation_under_review |
| VH_F_body_of_uterus | 302 | 0 | 196/196 | pass | pass |
| VH_F_fundus_of_uterus | 214 | 0 | 198/198 | pass | pass |
| VH_F_cornua | 78 | 0 | 220/220 | not_a_major_structure | below_click_size_floor |
| VH_F_lower_uterine_segment | 176 | 0 | 202/202 | not_a_major_structure | pass |
| VH_F_posterior_wall_of_uterus | 0 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_anterior_wall_of_uterus | 0 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_cervix | 142 | 0 | 196/196 | pass | pass |
| VH_F_internal_cervical_os | 54 | 0 | 216/216 | not_a_major_structure | pass |
| VH_F_external_cervical_os | 54 | 0 | 270/270 | not_a_major_structure | pass |
| VH_F_left_ovary | 0 | 0 | 212/212 | pass | pass |
| VH_F_right_ovary | 0 | 0 | 206/206 | pass | pass |
| VH_F_ampulla_of_uterine_tube_L | 80 | 0 | 192/192 | not_a_major_structure | pass |
| VH_F_isthmus_of_fallopian_tube_L | 82 | 0 | 198/198 | not_a_major_structure | pass |
| VH_F_fibria_of_uterine_tube_L | 41 | 0 | 198/198 | not_a_major_structure | pass |
| VH_F_uterine_tube_infundibulum_L | 80 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_ampulla_of_uterine_tube_R | 80 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_isthmus_of_fallopian_tube_R | 80 | 0 | 200/200 | not_a_major_structure | pass |
| VH_F_fibria_of_uterine_tube_R | 40 | 0 | 198/198 | not_a_major_structure | pass |
| VH_F_uterine_tube_infundibulum_R | 80 | 0 | 200/200 | not_a_major_structure | pass |
| VH_F_fundus_of_urinary_bladder_dome | 356 | 0 | 194/194 | pass | pass |
| VH_F_urinary_bladder_neck_smooth_muscle | 80 | 0 | 200/200 | not_a_major_structure | pass |
| VH_F_fundus_of_urinary_bladder_base | 614 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_trigone_of_urinary_bladder | 182 | 0 | 200/200 | pass | pass |
| VH_F_ureteral_orifice_R | 30 | 0 | 360/360 | not_a_major_structure | pass |
| VH_F_ureteral_orifice_L | 42 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_sacrum | 0 | 0 | 194/194 | pass | pass |
| VH_F_coccyx | 0 | 0 | 200/200 | pass | pass |
| VH_F_pubis_spongy_bone_L | 94 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_pubis_spongy_bone_R | 92 | 0 | 198/198 | not_a_major_structure | pass |
| VH_F_pubis_compact_bone_R | 0 | 0 | 196/196 | pass | pass |
| VH_F_pubis_compact_bone_L | 0 | 0 | 192/192 | pass | pass |
| VH_F_ilium_compact_bone_R | 0 | 0 | 194/194 | pass | pass |
| VH_F_ilium_compact_bone_L | 0 | 0 | 194/194 | pass | pass |
| VH_F_ilium_spongy_bone_L | 80 | 0 | 196/196 | not_a_major_structure | pass |
| VH_F_ilium_spongy_bone_R | 77 | 0 | 194/194 | not_a_major_structure | pass |
| VH_F_ischium_compact_bone_R | 0 | 0 | 194/194 | pass | pass |
| VH_F_ischium_compact_bone_L | 0 | 0 | 194/194 | pass | pass |
| VH_F_ischium_spongy_bone_R | 101 | 0 | 200/200 | not_a_major_structure | pass |
| VH_F_ischium_spongy_bone_L | 100 | 0 | 200/200 | not_a_major_structure | pass |

| Selectable structure / group | Beginner Find | Advanced Find | Name that structure |
|---|---|---|---|
| Tubal opening patches (NIH source annotation under review) | annotation_under_review | annotation_under_review | annotation_under_review |
| Body of uterus | pass | pass | pass |
| Fundus of uterus | pass | pass | pass |
| Uterine horns | not_a_major_structure | below_click_size_floor | no_supported_viewport |
| Lower uterine segment | not_a_major_structure | pass | no_supported_viewport |
| Posterior uterine wall | not_a_major_structure | pass | pass |
| Anterior uterine wall | not_a_major_structure | pass | pass |
| Cervix | pass | pass | pass |
| Internal cervical opening | not_a_major_structure | pass | pass |
| External cervical opening | not_a_major_structure | pass | pass |
| Ovary (left) | pass | pass | pass |
| Ovary (right) | pass | pass | pass |
| Bladder dome | pass | pass | no_supported_viewport |
| Smooth muscle at bladder neck | not_a_major_structure | pass | pass |
| Bladder base | not_a_major_structure | pass | no_supported_viewport |
| Bladder trigone | pass | pass | no_supported_viewport |
| Ureteral opening (right) | not_a_major_structure | pass | pass |
| Ureteral opening (left) | not_a_major_structure | pass | no_supported_viewport |
| Sacrum | pass | pass | pass |
| Coccyx | pass | pass | no_supported_viewport |
| Pubis, spongy bone (left) | not_a_major_structure | pass | no_supported_viewport |
| Pubis, spongy bone (right) | not_a_major_structure | pass | no_supported_viewport |
| Pubis, compact bone (right) | pass | pass | no_supported_viewport |
| Pubis, compact bone (left) | pass | pass | no_supported_viewport |
| Ilium, compact bone (right) | pass | pass | pass |
| Ilium, compact bone (left) | pass | pass | no_supported_viewport |
| Ilium, spongy bone (left) | not_a_major_structure | pass | no_supported_viewport |
| Ilium, spongy bone (right) | not_a_major_structure | pass | pass |
| Ischium, compact bone (right) | pass | pass | pass |
| Ischium, compact bone (left) | pass | pass | pass |
| Ischium, spongy bone (right) | not_a_major_structure | pass | no_supported_viewport |
| Ischium, spongy bone (left) | not_a_major_structure | pass | pass |
| Ampulla of uterine tube (left) | not_a_major_structure | pass | no_supported_viewport |
| Isthmus of uterine tube (left) | not_a_major_structure | pass | pass |
| Fimbriae of uterine tube (left) | not_a_major_structure | pass | no_supported_viewport |
| Infundibulum of uterine tube (left) | not_a_major_structure | pass | pass |
| Ampulla of uterine tube (right) | not_a_major_structure | pass | no_supported_viewport |
| Isthmus of uterine tube (right) | not_a_major_structure | pass | no_supported_viewport |
| Fimbriae of uterine tube (right) | not_a_major_structure | pass | no_supported_viewport |
| Infundibulum of uterine tube (right) | not_a_major_structure | pass | pass |
| Uterus | pass | pass | no_supported_viewport |
| Urinary bladder | pass | pass | no_supported_viewport |
| Uterine tube (left) | pass | pass | no_supported_viewport |
| Uterine tube (right) | pass | pass | no_supported_viewport |

At aspect 1: 19 beginner Find, 42 advanced Find and 20 recognition targets pass. Other aspect ratios have separate precomputed pass/fail ranges. Full measurements: public/data/nih-hra-mesh-quality.json, female-recognition-skips.json and female-recognition-context-skips.json. Rejection is logged rather than replaced with a visually unfair question.

## Teaching content and annotation gap

43 of 44 selectable entries have location, function, nursing notes, anatomical term and related references in src/data/nih-hra-lessons.json, compiled into female-anatomy.json. They adapt OpenStax Anatomy and Physiology 2e sections 27.2, 25.2 and 8.3, with per-entry source URLs and separate CC BY-NC-SA 4.0 text attribution. Access for free at openstax.org: https://openstax.org/details/books/anatomy-and-physiology-2e

The remaining source annotation, VH_F_abdominal_ostium_of_uterine_tube, names abdominal ostia but supplies paired medial patches near the uterine horns. It is visibly flagged as under review, excluded from all quiz formats and distractors, and has no invented teaching text. It appears in the existing missing-fields list and the static quality report. This is an annotation concern inferred from the supplied coordinates, not a verified correction to NIH's data.

## Database and licensing

Migration 20260907083540_nih_hra_provenance.sql adds source and license JSONB columns with separate geometry/text component records, plus availability, to the existing public anatomy_structures table. Every row is populated. Public read/service-role-only write RLS is retained. Retired IDs remain so saved user rows are not deleted or relabelled. Local PostgreSQL RLS tests prove cross-user isolation still holds. Apply and test this migration in the development project before production.

Z-Anatomy geometry, OpenStax text and NIH HRA models remain three separately licensed components in a collection, not a single merged work. Existing Z-Anatomy component terms remain explicitly referenced. The footer, /credits, /terms and per-structure panel retain this distinction.
